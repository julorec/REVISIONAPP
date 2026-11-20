import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminImportModal } from './components/AdminImportModal';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PseudoModal } from './components/PseudoModal';
import { QuizResults } from './components/QuizResults';
import { QuizSession } from './components/QuizSession';
import { SubjectTabsBar } from './components/SubjectTabsBar';
import { SubjectWorkspace, type SubjectSubTab } from './components/SubjectWorkspace';
import { useTheme } from './hooks/useTheme';
import {
  fetchQuizzes,
  fetchScores,
  loadProgress,
  loadStudentPseudo,
  recordQuizScore,
  saveProgress,
  saveStudentPseudo,
} from './lib/supabase';
import type {
  ExamSize,
  HydratedQuestion,
  ProgressMap,
  QuizRow,
  ScoreEntry,
  UserAnswer,
} from './types/quiz';
import {
  buildSubjectSummaries,
  computeQuizResult,
  getMissedQuestionsForSubject,
  selectQuizQuestions,
  shuffleArray,
} from './utils/quizEngine';

type AppView = 'subject' | 'quiz' | 'results';

interface ActiveSession {
  key: number;
  title: string;
  matiere: string;
  sectionDs: string;
  questions: HydratedQuestion[];
  answers: Array<UserAnswer | null>;
}

export default function App() {
  const { preference: theme, setPreference: setTheme } = useTheme();

  // Student pseudo persisted in localStorage; asked on first launch if absent
  const [pseudo, setPseudo] = useState<string>(() => loadStudentPseudo());
  const [pseudoModalOpen, setPseudoModalOpen] = useState<boolean>(() => !loadStudentPseudo());

  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  const [view, setView] = useState<AppView>('subject');
  const [selectedMatiere, setSelectedMatiere] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<SubjectSubTab>('revisions');
  const [leaderboardSectionFilter, setLeaderboardSectionFilter] = useState<string>('all');

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [scoreSavedStatus, setScoreSavedStatus] = useState<'saving' | 'supabase' | 'local' | null>(
    null
  );
  const [adminOpen, setAdminOpen] = useState(false);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    const result = await fetchQuizzes();
    setRows(result.rows);
    setLoading(false);
  }, []);

  const loadAllScores = useCallback(async () => {
    setScoresLoading(true);
    const result = await fetchScores();
    setScores(result.scores);
    setScoresLoading(false);
  }, []);

  useEffect(() => {
    void loadQuizzes();
    void loadAllScores();
  }, [loadQuizzes, loadAllScores]);

  const subjects = useMemo(() => buildSubjectSummaries(rows, progress), [rows, progress]);

  useEffect(() => {
    if (!selectedMatiere && subjects.length > 0) {
      setSelectedMatiere(subjects[0].matiere);
    }
  }, [subjects, selectedMatiere]);

  const currentSubject = useMemo(
    () => subjects.find((s) => s.matiere === selectedMatiere) ?? subjects[0] ?? null,
    [subjects, selectedMatiere]
  );

  const missedForCurrentSubject = useMemo(() => {
    if (!currentSubject) return [];
    return getMissedQuestionsForSubject(rows, currentSubject.matiere, progress);
  }, [rows, currentSubject, progress]);

  const handleSavePseudo = (nextPseudo: string) => {
    const saved = saveStudentPseudo(nextPseudo);
    setPseudo(saved);
    setPseudoModalOpen(false);
  };

  const startSession = useCallback(
    (matiere: string, sectionDs: string, title: string, questions: HydratedQuestion[]) => {
      if (questions.length === 0) return;
      setScoreSavedStatus(null);
      setSession({
        key: Date.now(),
        title,
        matiere,
        sectionDs,
        questions,
        answers: questions.map(() => null),
      });
      setView('quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleSelectMatiere = (matiere: string) => {
    setSelectedMatiere(matiere);
    setLeaderboardSectionFilter('all');
    setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeSubTab = (tab: SubjectSubTab) => {
    setActiveSubTab(tab);
    if (view !== 'subject') setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchSectionExam = (sectionDs: string, examSize: ExamSize) => {
    if (!currentSubject) return;
    const picked = selectQuizQuestions(rows, {
      matiere: currentSubject.matiere,
      section_ds: sectionDs,
      mode: 'exam',
      examSize,
    });
    startSession(
      currentSubject.matiere,
      sectionDs,
      `${sectionDs} · Examen (${picked.length}q)`,
      picked
    );
  };

  const handleLaunchThemesQuiz = (sectionDs: string, selectedThemes: string[]) => {
    if (!currentSubject) return;
    const picked = selectQuizQuestions(rows, {
      matiere: currentSubject.matiere,
      section_ds: sectionDs,
      themes: selectedThemes,
      mode: 'themes',
    });
    const label =
      selectedThemes.length > 0
        ? `${sectionDs} · ${selectedThemes.slice(0, 2).join(' + ')}${selectedThemes.length > 2 ? ` (+${selectedThemes.length - 2})` : ''}`
        : `${sectionDs} · Révision complète`;
    startSession(currentSubject.matiere, sectionDs, label, picked);
  };

  const handleRecordAnswer = useCallback((questionId: string, isCorrect: boolean) => {
    setProgress((prev) => {
      const existing = prev[questionId];
      const next: ProgressMap = {
        ...prev,
        [questionId]: {
          tries: (existing?.tries ?? 0) + 1,
          right: (existing?.right ?? 0) + (isCorrect ? 1 : 0),
          lastOk: isCorrect,
          updatedAt: Date.now(),
        },
      };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleFinishQuiz = useCallback(
    (answers: Array<UserAnswer | null>) => {
      if (!session) return;
      const completed: ActiveSession = { ...session, answers };
      setSession(completed);
      setView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const summary = computeQuizResult(completed.questions, answers);
      setScoreSavedStatus('saving');
      void recordQuizScore({
        pseudo: pseudo || 'Étudiant ESET',
        matiere: completed.matiere,
        section_ds: completed.sectionDs,
        points: summary.points,
        bonnes_reponses: summary.score,
        total_questions: summary.total,
      }).then((res) => {
        setScoreSavedStatus(res.persistedTo);
        setScores((prev) => [res.entry, ...prev]);
      });
    },
    [session, pseudo]
  );

  const handleReplayMissed = useCallback(
    (missed: HydratedQuestion[]) => {
      if (missed.length === 0) return;
      const matiere = missed[0].matiere;
      const sectionDs = missed[0].section_ds || 'DS 1';
      startSession(
        matiere,
        sectionDs,
        `Rejouer mes erreurs (${missed.length}q)`,
        shuffleArray(missed)
      );
    },
    [startSession]
  );

  const handleRestartSame = useCallback(() => {
    if (!session) return;
    startSession(
      session.matiere,
      session.sectionDs,
      session.title,
      shuffleArray(session.questions)
    );
  }, [session, startSession]);

  const quizSummary = useMemo(() => {
    if (!session || view !== 'results') return null;
    return computeQuizResult(session.questions, session.answers);
  }, [session, view]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <OfflineIndicator />
      <Header
        theme={theme}
        pseudo={pseudo}
        onThemeChange={setTheme}
        onGoHome={() => {
          setActiveSubTab('revisions');
          setView('subject');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onEditPseudo={() => setPseudoModalOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* Top Matières Tab Navigation (always available outside active quiz) */}
      {view !== 'quiz' && subjects.length > 0 && (
        <SubjectTabsBar
          subjects={subjects}
          activeMatiere={currentSubject?.matiere ?? null}
          loading={loading}
          onSelectMatiere={handleSelectMatiere}
          onRefresh={() => {
            void loadQuizzes();
            void loadAllScores();
          }}
        />
      )}

      <main className="flex-1">
        {loading && !currentSubject && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 animate-pulse"
              >
                <div className="h-5 w-24 rounded bg-[var(--surface-2)]" />
                <div className="mt-4 h-12 w-full rounded-xl bg-[var(--surface-2)]" />
                <div className="mt-6 flex gap-2">
                  <div className="h-9 w-24 rounded-xl bg-[var(--surface-2)]" />
                  <div className="h-9 w-28 rounded-xl bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'subject' && currentSubject && (
          <SubjectWorkspace
            subject={currentSubject}
            allRows={rows}
            activeSubTab={activeSubTab}
            missedQuestions={missedForCurrentSubject}
            scores={scores}
            scoresLoading={scoresLoading}
            currentPseudo={pseudo}
            leaderboardSectionFilter={leaderboardSectionFilter}
            onChangeSubTab={handleChangeSubTab}
            onChangeLeaderboardSection={setLeaderboardSectionFilter}
            onRefreshScores={() => void loadAllScores()}
            onLaunchSectionExam={handleLaunchSectionExam}
            onLaunchThemesQuiz={handleLaunchThemesQuiz}
            onReplayMissed={() => handleReplayMissed(missedForCurrentSubject)}
          />
        )}

        {view === 'quiz' && session && (
          <QuizSession
            key={session.key}
            title={session.title}
            questions={session.questions}
            onRecordAnswer={handleRecordAnswer}
            onFinish={handleFinishQuiz}
            onExit={() => setView('subject')}
          />
        )}

        {view === 'results' && session && quizSummary && (
          <QuizResults
            title={session.title}
            sectionDs={session.sectionDs}
            pseudo={pseudo}
            scoreSavedStatus={scoreSavedStatus}
            questions={session.questions}
            answers={session.answers}
            summary={quizSummary}
            onReplayMissed={handleReplayMissed}
            onRestartSame={handleRestartSame}
            onOpenLeaderboard={() => {
              setSelectedMatiere(session.matiere);
              setActiveSubTab('classement');
              setLeaderboardSectionFilter('all');
              setView('subject');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBackToSubject={() => {
              setSelectedMatiere(session.matiere);
              setActiveSubTab('revisions');
              setView('subject');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Thumb-Zone Mobile Bottom Tab Bar (Révisions | Classement) */}
      {view !== 'quiz' && (
        <MobileBottomNav activeSubTab={activeSubTab} onChangeSubTab={handleChangeSubTab} />
      )}

      <PseudoModal
        open={pseudoModalOpen}
        initialPseudo={pseudo}
        required={!pseudo}
        onSave={handleSavePseudo}
        onClose={() => setPseudoModalOpen(false)}
      />

      <AdminImportModal
        open={adminOpen}
        existingSubjects={subjects.map((s) => s.matiere)}
        allQuizzes={rows}
        onClose={() => setAdminOpen(false)}
        onImported={loadQuizzes}
      />
    </div>
  );
}
