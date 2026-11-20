import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Lock,
  Play,
  Trophy,
} from 'lucide-react';
import type {
  DifficultyLevel,
  ProgressMap,
  QuizCountOption,
  QuizRow,
  ScoreEntry,
  SubjectSummary,
  TrainingMode,
} from '../types/quiz';
import { computeDsSelectionStats } from '../utils/quizEngine';
import { SubjectLeaderboard } from './SubjectLeaderboard';

export type SubjectSubTab = 'evaluations' | 'classement';

export interface DsLaunchConfig {
  sectionDs: string;
  mode: TrainingMode;
  themes: string[];
  difficulties: DifficultyLevel[];
  count: QuizCountOption;
}

interface DsDraftState {
  mode: TrainingMode;
  themes: string[];
  difficulties: DifficultyLevel[];
  count: QuizCountOption;
}

const DEFAULT_DRAFT: DsDraftState = {
  mode: 'standard',
  themes: [],
  difficulties: [],
  count: 20,
};

const DIFFICULTY_PILLS: Array<{ level: DifficultyLevel; stars: string; label: string }> = [
  { level: 1, stars: '⭐', label: '1' },
  { level: 2, stars: '⭐⭐', label: '2' },
  { level: 3, stars: '⭐⭐⭐', label: '3' },
];

const COUNT_OPTIONS: Array<{ value: QuizCountOption; label: string }> = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 'max', label: 'Max' },
];

interface SubjectWorkspaceProps {
  subject: SubjectSummary;
  allRows: QuizRow[];
  progress: ProgressMap;
  activeSubTab: SubjectSubTab;
  scores: ScoreEntry[];
  scoresLoading: boolean;
  currentPseudo: string;
  leaderboardSectionFilter: string;
  onBackHome: () => void;
  onChangeSubTab: (tab: SubjectSubTab) => void;
  onChangeLeaderboardSection: (sectionDs: string) => void;
  onRefreshScores: () => void;
  onLaunchDsQuiz: (config: DsLaunchConfig) => void;
  onOpenAdmin: () => void;
}

export function SubjectWorkspace({
  subject,
  allRows,
  progress,
  activeSubTab,
  scores,
  scoresLoading,
  currentPseudo,
  leaderboardSectionFilter,
  onBackHome,
  onChangeSubTab,
  onChangeLeaderboardSection,
  onRefreshScores,
  onLaunchDsQuiz,
  onOpenAdmin,
}: SubjectWorkspaceProps) {
  // Single-open accordion state (only 1 DS expanded at a time)
  const [expandedDs, setExpandedDs] = useState<string | null>(null);
  const [configByDs, setConfigByDs] = useState<Record<string, DsDraftState>>({});

  // Reset expanded DS & drafts when switching subject
  useEffect(() => {
    setExpandedDs(null);
    setConfigByDs({});
  }, [subject.matiere]);

  const getDraft = (sectionDs: string): DsDraftState => configByDs[sectionDs] ?? DEFAULT_DRAFT;

  const updateDraft = (sectionDs: string, updater: (prev: DsDraftState) => DsDraftState) => {
    setConfigByDs((prev) => ({
      ...prev,
      [sectionDs]: updater(prev[sectionDs] ?? DEFAULT_DRAFT),
    }));
  };

  const toggleTheme = (sectionDs: string, theme: string) => {
    updateDraft(sectionDs, (prev) => {
      const exists = prev.themes.includes(theme);
      return {
        ...prev,
        themes: exists ? prev.themes.filter((t) => t !== theme) : [...prev.themes, theme],
      };
    });
  };

  const toggleDifficulty = (sectionDs: string, level: DifficultyLevel) => {
    updateDraft(sectionDs, (prev) => {
      const exists = prev.difficulties.includes(level);
      return {
        ...prev,
        difficulties: exists
          ? prev.difficulties.filter((d) => d !== level)
          : [...prev.difficulties, level].sort((a, b) => a - b),
      };
    });
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6 pb-12">
      {/* ==================== LEVEL 2 HEADER: BACK + SUBJECT NAME ==================== */}
      <div>
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-2 -ml-2 text-[13.5px] font-medium text-[var(--dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Retour à l&apos;accueil</span>
        </button>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[var(--text)] leading-tight">
            {subject.matiere}
          </h1>
          <p className="font-mono-code text-[12.5px] text-[var(--dim)] tabular-nums">
            {subject.totalQuestions > 0
              ? `${subject.sections.length} DS · ${subject.totalQuestions} questions`
              : 'Aucun quiz publié'}
          </p>
        </div>
      </div>

      {/* ==================== LEVEL 2 SUB-TABS: ÉVALUATIONS (DS) | CLASSEMENT ==================== */}
      <nav
        className="mt-4 flex gap-2 border-b border-[var(--line)]"
        role="tablist"
        aria-label={`Navigation de ${subject.matiere}`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'evaluations'}
          onClick={() => onChangeSubTab('evaluations')}
          className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3.5 py-2.5 text-[14.5px] font-medium transition-colors -mb-[1px] whitespace-nowrap ${
            activeSubTab === 'evaluations'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--dim)] hover:text-[var(--text)]'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Évaluations (DS)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'classement'}
          onClick={() => onChangeSubTab('classement')}
          className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3.5 py-2.5 text-[14.5px] font-medium transition-colors -mb-[1px] whitespace-nowrap ${
            activeSubTab === 'classement'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--dim)] hover:text-[var(--text)]'
          }`}
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span>Classement</span>
        </button>
      </nav>

      {/* ==================== TAB 1: ÉVALUATIONS (DS) + LEVEL 3 ACCORDION ==================== */}
      {activeSubTab === 'evaluations' && (
        <div className="mt-5">
          {subject.sections.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-[17px] font-semibold text-[var(--text)]">
                Bientôt disponible
              </h2>
              <p className="mt-1.5 text-[14px] text-[var(--dim)]">
                Aucun DS n&apos;est encore publié pour <strong>{subject.matiere}</strong>.
              </p>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 text-[13.5px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
              >
                <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Importer un DS (Admin)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {subject.sections.map((section) => {
                const isExpanded = expandedDs === section.section_ds;
                const draft = getDraft(section.section_ds);
                const stats = computeDsSelectionStats(allRows, progress, {
                  matiere: subject.matiere,
                  section_ds: section.section_ds,
                  mode: draft.mode,
                  themes: draft.themes,
                  difficulties: draft.difficulties,
                  count: draft.count,
                });

                const masteryPct = section.masteryRate ?? 0;

                return (
                  <article
                    key={section.section_ds}
                    className={`overflow-hidden rounded-2xl border bg-[var(--surface)] transition-colors ${
                      isExpanded ? 'border-[var(--accent)] shadow-xs' : 'border-[var(--line)]'
                    }`}
                  >
                    {/* Level 2 DS Card Header (click to toggle Level 3 Accordion) */}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`ds-panel-${section.section_ds}`}
                      onClick={() =>
                        setExpandedDs((curr) =>
                          curr === section.section_ds ? null : section.section_ds
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left transition-colors hover:bg-[var(--surface-2)]/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h2 className="text-[18px] sm:text-[19px] font-semibold tracking-[-0.015em] text-[var(--text)]">
                            {section.section_ds}
                          </h2>
                          <span className="font-mono-code text-[12.5px] text-[var(--dim)] tabular-nums">
                            {section.totalQuestions} question{section.totalQuestions > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Personal Mastery Bar */}
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                              style={{ width: `${masteryPct}%` }}
                            />
                          </div>
                          <span className="shrink-0 font-mono-code text-[12px] text-[var(--dim)] tabular-nums">
                            Maîtrise : {masteryPct}%
                          </span>
                        </div>
                      </div>

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--dim)] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 border-[var(--accent)] text-[var(--accent)]' : ''
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </button>

                    {/* ==================== LEVEL 3: ACCORDION CONFIGURATOR (ZERO DUPLICATES) ==================== */}
                    {isExpanded && (
                      <div
                        id={`ds-panel-${section.section_ds}`}
                        className="border-t border-[var(--line)] bg-[var(--bg)]/55 px-4 py-4 sm:px-5 sm:py-5 space-y-5"
                      >
                        {/* 1. Mode d'entraînement (Segmented Single Choice) */}
                        <div>
                          <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2">
                            Mode d&apos;entraînement
                          </p>
                          <div
                            className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1"
                            role="radiogroup"
                            aria-label={`Mode d'entraînement pour ${section.section_ds}`}
                          >
                            <button
                              type="button"
                              role="radio"
                              aria-checked={draft.mode === 'standard'}
                              onClick={() =>
                                updateDraft(section.section_ds, (prev) => ({
                                  ...prev,
                                  mode: 'standard',
                                }))
                              }
                              className={`min-h-[40px] rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                                draft.mode === 'standard'
                                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                  : 'text-[var(--dim)] hover:text-[var(--text)]'
                              }`}
                            >
                              Standard
                            </button>

                            <button
                              type="button"
                              role="radio"
                              aria-checked={draft.mode === 'exam'}
                              onClick={() =>
                                updateDraft(section.section_ds, (prev) => ({
                                  ...prev,
                                  mode: 'exam',
                                }))
                              }
                              className={`min-h-[40px] rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors ${
                                draft.mode === 'exam'
                                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                  : 'text-[var(--dim)] hover:text-[var(--text)]'
                              }`}
                            >
                              Mode Examen
                            </button>

                            <button
                              type="button"
                              role="radio"
                              aria-checked={draft.mode === 'errors'}
                              disabled={stats.missedInSection === 0}
                              onClick={() =>
                                updateDraft(section.section_ds, (prev) => ({
                                  ...prev,
                                  mode: 'errors',
                                }))
                              }
                              className={`min-h-[40px] rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                draft.mode === 'errors'
                                  ? 'bg-[var(--bad)] text-white'
                                  : 'text-[var(--dim)] hover:text-[var(--text)]'
                              }`}
                            >
                              Mes Erreurs ({stats.missedInSection})
                            </button>
                          </div>

                          {draft.mode === 'exam' && (
                            <p className="mt-2 text-[13px] text-[var(--dim)]">
                              Tirage aléatoire de 20 questions sur l&apos;ensemble du {section.section_ds} (conditions réelles).
                            </p>
                          )}
                          {draft.mode === 'errors' && (
                            <p className="mt-2 text-[13px] text-[var(--dim)]">
                              Cible uniquement vos {stats.missedInSection} question
                              {stats.missedInSection > 1 ? 's' : ''} ratée
                              {stats.missedInSection > 1 ? 's' : ''} sur ce DS.
                            </p>
                          )}
                        </div>

                        {/* 2. Filtres ciblés (affichés uniquement en mode Standard) */}
                        {draft.mode === 'standard' && (
                          <div className="space-y-4">
                            {/* Grands Thèmes */}
                            <div>
                              <p className="mb-2 font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]">
                                Grands Thèmes
                              </p>

                              <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label={`Grands thèmes de ${section.section_ds}`}
                              >
                                <button
                                  type="button"
                                  aria-pressed={draft.themes.length === 0}
                                  onClick={() =>
                                    updateDraft(section.section_ds, (prev) => ({
                                      ...prev,
                                      themes: [],
                                    }))
                                  }
                                  className={`inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                                    draft.themes.length === 0
                                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                                      : 'border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                                  }`}
                                >
                                  Tous
                                </button>

                                {section.themes.map((item) => {
                                  const active = draft.themes.includes(item.theme);
                                  return (
                                    <button
                                      key={item.theme}
                                      type="button"
                                      aria-pressed={active}
                                      onClick={() => toggleTheme(section.section_ds, item.theme)}
                                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                                        active
                                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                                          : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                                      }`}
                                    >
                                      {active && (
                                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                                      )}
                                      <span>{item.theme}</span>
                                      <span className="font-mono-code text-[11px] text-[var(--dim)] tabular-nums">
                                        {item.totalQuestions}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Difficulté */}
                            <div>
                              <p className="mb-2 font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]">
                                Difficulté
                              </p>

                              <div
                                className="flex flex-wrap gap-1.5"
                                role="group"
                                aria-label={`Difficulté pour ${section.section_ds}`}
                              >
                                <button
                                  type="button"
                                  aria-pressed={draft.difficulties.length === 0}
                                  onClick={() =>
                                    updateDraft(section.section_ds, (prev) => ({
                                      ...prev,
                                      difficulties: [],
                                    }))
                                  }
                                  className={`inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                                    draft.difficulties.length === 0
                                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                                      : 'border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                                  }`}
                                >
                                  Toutes
                                </button>

                                {DIFFICULTY_PILLS.map((pill) => {
                                  const active = draft.difficulties.includes(pill.level);
                                  return (
                                    <button
                                      key={pill.level}
                                      type="button"
                                      aria-pressed={active}
                                      aria-label={`Difficulté ${pill.level} étoile${pill.level > 1 ? 's' : ''}`}
                                      onClick={() =>
                                        toggleDifficulty(section.section_ds, pill.level)
                                      }
                                      className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                                        active
                                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                                          : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                                      }`}
                                    >
                                      <span className="font-mono-code text-[12px]">
                                        {pill.label}
                                      </span>
                                      <span aria-hidden="true" className="text-[11px] leading-none">
                                        {pill.stars}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Nombre de questions (compact selector, hidden in Mode Examen) */}
                        {draft.mode !== 'exam' && (
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]">
                                Nombre de questions
                              </p>
                              <span className="font-mono-code text-[11.5px] text-[var(--dim)] tabular-nums">
                                {stats.availableForMode} dispo
                              </span>
                            </div>

                            <div
                              className="inline-flex w-full sm:w-auto items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1"
                              role="radiogroup"
                              aria-label={`Nombre de questions pour ${section.section_ds}`}
                            >
                              {COUNT_OPTIONS.map((opt) => {
                                const active = draft.count === opt.value;
                                return (
                                  <button
                                    key={String(opt.value)}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() =>
                                      updateDraft(section.section_ds, (prev) => ({
                                        ...prev,
                                        count: opt.value,
                                      }))
                                    }
                                    className={`min-h-[36px] flex-1 sm:flex-none sm:min-w-[60px] rounded-lg px-3 font-mono-code text-[13px] font-semibold transition-colors ${
                                      active
                                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                        : 'text-[var(--dim)] hover:text-[var(--text)]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Warning if active filters match 0 questions */}
                        {stats.effectiveCount === 0 && (
                          <p
                            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--bad)]"
                            role="status"
                          >
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>Aucune question ne correspond à ces filtres.</span>
                          </p>
                        )}

                        {/* 4. Single Full-Width Primary CTA */}
                        <button
                          type="button"
                          disabled={stats.effectiveCount === 0}
                          onClick={() =>
                            onLaunchDsQuiz({
                              sectionDs: section.section_ds,
                              mode: draft.mode,
                              themes: draft.themes,
                              difficulties: draft.difficulties,
                              count: draft.count,
                            })
                          }
                          className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-[15px] font-semibold text-[var(--accent-ink)] shadow-xs transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          <Play className="h-4 w-4 shrink-0" />
                          <span>
                            Démarrer le quiz ({stats.effectiveCount} question
                            {stats.effectiveCount > 1 ? 's' : ''})
                          </span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: CLASSEMENT PAR MATIÈRE ==================== */}
      {activeSubTab === 'classement' && (
        <div className="mt-5">
          <SubjectLeaderboard
            matiere={subject.matiere}
            availableSections={subject.sections.map((s) => s.section_ds)}
            scores={scores}
            selectedSection={leaderboardSectionFilter}
            currentPseudo={currentPseudo}
            loading={scoresLoading}
            onChangeSection={onChangeLeaderboardSection}
            onRefresh={onRefreshScores}
          />
        </div>
      )}
    </section>
  );
}
