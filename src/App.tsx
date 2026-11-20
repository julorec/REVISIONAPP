import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminImportModal } from './components/AdminImportModal';
import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PseudoModal } from './components/PseudoModal';
import { QuizResults } from './components/QuizResults';
import { QuizSession } from './components/QuizSession';
import {
  SubjectWorkspace,
  type DsLaunchConfig,
  type SubjectSubTab,
} from './components/SubjectWorkspace';
import { useTheme } from './hooks/useTheme';
import {
  fetchAppSettings,
  fetchQuizzes,
  fetchScores,
  fetchSubjects,
  loadProgress,
  loadStudentPseudo,
  recordQuizScore,
  saveProgress,
  saveStudentPseudo,
  subscribeToSupabaseChanges,
} from './lib/supabase';
import type {
  AppSettings,
  HydratedQuestion,
  ProgressMap,
  QuizRow,
  ScoreEntry,
  SubjectRecord,
  UserAnswer,
} from './types/quiz';
import {
  buildSubjectSummaries,
  computeQuizResult,
  getDifficultyStars,
  selectDsQuizQuestions,
  shuffleArray,
} from './utils/quizEngine';
import { shouldTriggerBackgroundSync } from './utils/syncState';

type AppView = 'hub' | 'subject' | 'quiz' | 'results';

interface ActiveSession {
  key: number;
  title: string;
  matiere: string;
  sectionDs: string;
  questions: HydratedQuestion[];
  answers: Array<UserAnswer | null>;
}

const FOREGROUND_SYNC_INTERVAL_MS = 5_000;

export default function App() {
  const { preference: theme, setPreference: setTheme } = useTheme();

  // Student pseudo persisted in localStorage; asked on first launch if absent
  const [pseudo, setPseudo] = useState<string>(() => loadStudentPseudo());
  const [pseudoModalOpen, setPseudoModalOpen] = useState<boolean>(() => !loadStudentPseudo());

  // Live Supabase catalog: subjects, app_settings, quizzes, scores (zero local quiz data)
  const [registeredSubjects, setRegisteredSubjects] = useState<SubjectRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ home_banner_url: null });
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  // 3-Level Navigation: hub -> subject (DS accordion) -> quiz -> results
  const [view, setView] = useState<AppView>('hub');
  const [selectedMatiere, setSelectedMatiere] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<SubjectSubTab>('evaluations');
  const [leaderboardSectionFilter, setLeaderboardSectionFilter] = useState<string>('all');

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [scoreSavedStatus, setScoreSavedStatus] = useState<
    'saving' | 'supabase' | 'pending' | null
  >(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const lastSyncAtRef = useRef<number>(0);

  const loadCatalog = useCallback(async (opts?: { silent?: boolean }) => {
    lastSyncAtRef.current = Date.now();
    if (!opts?.silent) {
      setSyncing(true);
    }

    const [quizzesRes, subjectsRes, settingsRes] = await Promise.all([
      fetchQuizzes(),
      fetchSubjects(),
      fetchAppSettings(),
    ]);

    setRows(quizzesRes.rows);
    setRegisteredSubjects(subjectsRes.subjects);
    setSettings(settingsRes.settings);

    // Only surface a connectivity banner if the core quizzes query failed
    setSyncError(quizzesRes.error ?? null);
    setLoading(false);
    setSyncing(false);
  }, []);

  const loadAllScores = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setScoresLoading(true);
    }
    const result = await fetchScores();
    setScores(result.scores);
    setScoresLoading(false);
  }, []);

  // 1. Initial sync from Supabase on mount
  useEffect(() => {
    void loadCatalog();
    void loadAllScores();
  }, [loadCatalog, loadAllScores]);

  // 2. Automatic Realtime sync across quizzes, subjects, app_settings, and scores
  useEffect(() => {
    return subscribeToSupabaseChanges({
      onQuizzesChanged: () => {
        void loadCatalog({ silent: true });
      },
      onSubjectsChanged: () => {
        void loadCatalog({ silent: true });
      },
      onSettingsChanged: () => {
        void loadCatalog({ silent: true });
      },
      onScoresChanged: () => {
        void loadAllScores({ silent: true });
      },
    });
  }, [loadCatalog, loadAllScores]);

  // 3. Automatic foreground / reconnect resync (ideal for mobile PWAs waking from background)
  useEffect(() => {
    const syncIfStale = () => {
      if (
        shouldTriggerBackgroundSync(lastSyncAtRef.current, Date.now(), FOREGROUND_SYNC_INTERVAL_MS)
      ) {
        void loadCatalog({ silent: true });
        void loadAllScores({ silent: true });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncIfStale();
      }
    };

    const handleOnline = () => {
      void loadCatalog({ silent: true });
      void loadAllScores({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncIfStale);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncIfStale);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadCatalog, loadAllScores]);

  const subjects = useMemo(
    () => buildSubjectSummaries(rows, progress, registeredSubjects),
    [rows, progress, registeredSubjects]
  );

  // If currently viewing a subject that was removed remotely, return cleanly to Hub
  useEffect(() => {
    if (view === 'subject' && selectedMatiere && !subjects.some((s) => s.matiere === selectedMatiere)) {
      if (subjects.length > 0) {
        setSelectedMatiere(subjects[0].matiere);
      } else {
        setView('hub');
      }
    }
  }, [view, selectedMatiere, subjects]);

  const currentSubject = useMemo(
    () => subjects.find((s) => s.matiere === selectedMatiere) ?? null,
    [subjects, selectedMatiere]
  );

  const handleSavePseudo = (nextPseudo: string) => {
    const saved = saveStudentPseudo(nextPseudo);
    setPseudo(saved);
    setPseudoModalOpen(false);
  };

  const handleGoHome = useCallback(() => {
    setView('hub');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectSubject = useCallback((matiere: string) => {
    setSelectedMatiere(matiere);
    setActiveSubTab('evaluations');
    setLeaderboardSectionFilter('all');
    setView('subject');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChangeSubTab = useCallback((tab: SubjectSubTab) => {
    setActiveSubTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  const handleLaunchDsQuiz = useCallback(
    (config: DsLaunchConfig) => {
      if (!currentSubject) return;
      const picked = selectDsQuizQuestions(rows, progress, {
        matiere: currentSubject.matiere,
        section_ds: config.sectionDs,
        mode: config.mode,
        themes: config.themes,
        difficulties: config.difficulties,
        count: config.count,
      });

      if (picked.length === 0) return;

      let title: string;
      if (config.mode === 'exam') {
        title = `${config.sectionDs} · Mode Examen (${picked.length}q)`;
      } else if (config.mode === 'errors') {
        title = `${config.sectionDs} · Mes Erreurs (${picked.length}q)`;
      } else {
        const parts: string[] = [config.sectionDs];
        if (config.themes.length > 0) {
          parts.push(
            `${config.themes.slice(0, 2).join(' + ')}${config.themes.length > 2 ? ` (+${config.themes.length - 2})` : ''}`
          );
        }
        if (config.difficulties.length > 0) {
          parts.push(config.difficulties.map(getDifficultyStars).join(' / '));
        }
        if (parts.length === 1) {
          parts.push(`Standard (${picked.length}q)`);
        }
        title = parts.join(' · ');
      }

      startSession(currentSubject.matiere, config.sectionDs, title, picked);
    },
    [currentSubject, rows, progress, startSession]
  );

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
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <OfflineIndicator />
      <Header
        theme={theme}
        pseudo={pseudo}
        onThemeChange={setTheme}
        onGoHome={handleGoHome}
        onEditPseudo={() => setPseudoModalOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main className="flex-1">
        {/* ==================== LEVEL 1: HOME HUB ==================== */}
        {view === 'hub' && (
          <HomeHub
            bannerUrl={settings.home_banner_url}
            subjects={subjects}
            loading={loading}
            syncing={syncing}
            syncError={syncError}
            onSelectSubject={handleSelectSubject}
            onRefresh={() => {
              void loadCatalog();
              void loadAllScores();
            }}
            onOpenAdmin={() => setAdminOpen(true)}
          />
        )}

        {/* ==================== LEVEL 2 & 3: SUBJECT WORKSPACE + DS ACCORDION ==================== */}
        {view === 'subject' && currentSubject && (
          <SubjectWorkspace
            subject={currentSubject}
            allRows={rows}
            progress={progress}
            activeSubTab={activeSubTab}
            scores={scores}
            scoresLoading={scoresLoading}
            currentPseudo={pseudo}
            leaderboardSectionFilter={leaderboardSectionFilter}
            onBackHome={handleGoHome}
            onChangeSubTab={handleChangeSubTab}
            onChangeLeaderboardSection={setLeaderboardSectionFilter}
            onRefreshScores={() => void loadAllScores()}
            onLaunchDsQuiz={handleLaunchDsQuiz}
            onOpenAdmin={() => setAdminOpen(true)}
          />
        )}

        {/* ==================== ACTIVE QUIZ SESSION ==================== */}
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

        {/* ==================== QUIZ RESULTS ==================== */}
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
              setActiveSubTab('evaluations');
              setView('subject');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      <PseudoModal
        open={pseudoModalOpen}
        initialPseudo={pseudo}
        required={!pseudo}
        onSave={handleSavePseudo}
        onClose={() => setPseudoModalOpen(false)}
      />

      <AdminImportModal
        open={adminOpen}
        subjects={registeredSubjects}
        bannerUrl={settings.home_banner_url}
        allQuizzes={rows}
        onClose={() => setAdminOpen(false)}
        onImported={async () => {
          await loadCatalog();
          await loadAllScores({ silent: true });
        }}
        onAppearanceChanged={async () => {
          await loadCatalog();
        }}
      />
    </div>
  );
}
