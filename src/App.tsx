import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminImportModal } from './components/AdminImportModal';
import { CatalogueHome } from './components/CatalogueHome';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QuizResults } from './components/QuizResults';
import { QuizSession } from './components/QuizSession';
import { SubjectWorkspace } from './components/SubjectWorkspace';
import { useTheme } from './hooks/useTheme';
import {
  fetchQuizzes,
  loadLocalQuizzes,
  loadProgress,
  saveProgress,
} from './lib/supabase';
import type {
  HydratedQuestion,
  ProgressMap,
  QuizMode,
  QuizRow,
  UserAnswer,
} from './types/quiz';
import {
  buildSubjectSummaries,
  computeQuizResult,
  getMissedQuestionsForSubject,
  selectQuizQuestions,
  shuffleArray,
} from './utils/quizEngine';

type AppView = 'home' | 'subject' | 'quiz' | 'results';

interface ActiveSession {
  key: number;
  title: string;
  matiere: string;
  questions: HydratedQuestion[];
  answers: Array<UserAnswer | null>;
}

export default function App() {
  const { preference: theme, setPreference: setTheme } = useTheme();

  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  const [view, setView] = useState<AppView>('home');
  const [selectedMatiere, setSelectedMatiere] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<QuizMode>('all');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchQuizzes();
    setRows(result.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const subjects = useMemo(
    () => buildSubjectSummaries(rows, progress),
    [rows, progress]
  );

  const currentSubject = useMemo(
    () => subjects.find((s) => s.matiere === selectedMatiere) ?? null,
    [subjects, selectedMatiere]
  );

  const matchingQuestions = useMemo(() => {
    if (!selectedMatiere) return [];
    return selectQuizQuestions(rows, {
      matiere: selectedMatiere,
      chapitre: selectedChapter,
      mode: selectedMode,
    });
  }, [rows, selectedMatiere, selectedChapter, selectedMode]);

  const missedForCurrentSubject = useMemo(() => {
    if (!selectedMatiere) return [];
    return getMissedQuestionsForSubject(rows, selectedMatiere, progress);
  }, [rows, selectedMatiere, progress]);

  const startSession = useCallback(
    (matiere: string, title: string, questions: HydratedQuestion[]) => {
      if (questions.length === 0) return;
      setSession({
        key: Date.now(),
        title,
        matiere,
        questions,
        answers: questions.map(() => null),
      });
      setView('quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleSelectSubject = (matiere: string) => {
    setSelectedMatiere(matiere);
    setSelectedChapter('all');
    setSelectedMode('all');
    setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickExam = (matiere: string) => {
    setSelectedMatiere(matiere);
    setSelectedChapter('all');
    setSelectedMode('exam');
    const examQuestions = selectQuizQuestions(rows, {
      matiere,
      chapitre: 'all',
      mode: 'exam',
    });
    startSession(
      matiere,
      `${matiere} · Examen Mélangé (${examQuestions.length}q)`,
      examQuestions
    );
  };

  const handleLaunchFilteredQuiz = () => {
    if (!selectedMatiere) return;
    const picked = selectQuizQuestions(rows, {
      matiere: selectedMatiere,
      chapitre: selectedChapter,
      mode: selectedMode,
    });
    const suffix =
      selectedMode === 'exam'
        ? `Examen Mélangé (${picked.length}q)`
        : selectedChapter !== 'all'
          ? selectedMode === 'all'
            ? selectedChapter
            : `${selectedChapter} · ${selectedMode}`
          : selectedMode === 'all'
            ? 'Toutes les questions'
            : selectedMode;

    startSession(selectedMatiere, `${selectedMatiere} · ${suffix}`, picked);
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

  const handleFinishQuiz = useCallback((answers: Array<UserAnswer | null>) => {
    setSession((prev) => (prev ? { ...prev, answers } : null));
    setView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReplayMissed = useCallback(
    (missed: HydratedQuestion[]) => {
      if (missed.length === 0) return;
      const matiere = missed[0].matiere;
      startSession(
        matiere,
        `${matiere} · Rejouer mes erreurs (${missed.length}q)`,
        shuffleArray(missed)
      );
    },
    [startSession]
  );

  const handleRestartSame = useCallback(() => {
    if (!session) return;
    startSession(session.matiere, session.title, shuffleArray(session.questions));
  }, [session, startSession]);

  const quizSummary = useMemo(() => {
    if (!session || view !== 'results') return null;
    return computeQuizResult(session.questions, session.answers);
  }, [session, view]);

  const localQuizzes = useMemo(() => loadLocalQuizzes(), [rows]);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <OfflineIndicator />
      <Header
        theme={theme}
        onThemeChange={setTheme}
        onGoHome={() => {
          setView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main className="flex-1">
        {view === 'home' && (
          <CatalogueHome
            subjects={subjects}
            loading={loading}
            onSelectSubject={handleSelectSubject}
            onQuickExam={handleQuickExam}
            onRefresh={() => void loadData()}
          />
        )}

        {view === 'subject' && currentSubject && (
          <SubjectWorkspace
            subject={currentSubject}
            selectedChapter={selectedChapter}
            selectedMode={selectedMode}
            matchingCount={matchingQuestions.length}
            missedQuestions={missedForCurrentSubject}
            onChangeChapter={setSelectedChapter}
            onChangeMode={setSelectedMode}
            onStartQuiz={handleLaunchFilteredQuiz}
            onReplayMissed={() => handleReplayMissed(missedForCurrentSubject)}
            onBack={() => setView('home')}
          />
        )}

        {view === 'quiz' && session && (
          <QuizSession
            key={session.key}
            title={session.title}
            questions={session.questions}
            onRecordAnswer={handleRecordAnswer}
            onFinish={handleFinishQuiz}
            onExit={() => setView(currentSubject ? 'subject' : 'home')}
          />
        )}

        {view === 'results' && session && quizSummary && (
          <QuizResults
            title={session.title}
            questions={session.questions}
            answers={session.answers}
            summary={quizSummary}
            onReplayMissed={handleReplayMissed}
            onRestartSame={handleRestartSame}
            onBackToSubject={() => {
              if (session.matiere) {
                setSelectedMatiere(session.matiere);
                setView('subject');
              } else {
                setView('home');
              }
            }}
            onBackToCatalogue={() => setView('home')}
          />
        )}
      </main>

      <AdminImportModal
        open={adminOpen}
        existingSubjects={subjects.map((s) => s.matiere)}
        localQuizzes={localQuizzes}
        onClose={() => setAdminOpen(false)}
        onImported={loadData}
      />
    </div>
  );
}
