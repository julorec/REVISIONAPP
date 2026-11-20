import { useEffect, useState } from 'react';
import { BookOpen, Check, Play, RotateCcw, Shuffle, Trophy, X } from 'lucide-react';
import type {
  ExamSize,
  HydratedQuestion,
  QuizRow,
  ScoreEntry,
  SubjectSummary,
} from '../types/quiz';
import { countMatchingThemeQuestions } from '../utils/quizEngine';
import { SubjectLeaderboard } from './SubjectLeaderboard';

export type SubjectSubTab = 'revisions' | 'classement';

interface SubjectWorkspaceProps {
  subject: SubjectSummary;
  allRows: QuizRow[];
  activeSubTab: SubjectSubTab;
  missedQuestions: HydratedQuestion[];
  scores: ScoreEntry[];
  scoresLoading: boolean;
  currentPseudo: string;
  leaderboardSectionFilter: string;
  onChangeSubTab: (tab: SubjectSubTab) => void;
  onChangeLeaderboardSection: (sectionDs: string) => void;
  onRefreshScores: () => void;
  onLaunchSectionExam: (sectionDs: string, examSize: ExamSize) => void;
  onLaunchThemesQuiz: (sectionDs: string, selectedThemes: string[]) => void;
  onReplayMissed: () => void;
}

export function SubjectWorkspace({
  subject,
  allRows,
  activeSubTab,
  missedQuestions,
  scores,
  scoresLoading,
  currentPseudo,
  leaderboardSectionFilter,
  onChangeSubTab,
  onChangeLeaderboardSection,
  onRefreshScores,
  onLaunchSectionExam,
  onLaunchThemesQuiz,
  onReplayMissed,
}: SubjectWorkspaceProps) {
  // Multi-selected themes keyed per section_ds
  const [selectedThemesByDs, setSelectedThemesByDs] = useState<Record<string, string[]>>({});
  // Preferred exam length (20 or 30 questions) keyed per section_ds
  const [examSizeByDs, setExamSizeByDs] = useState<Record<string, ExamSize>>({});

  // Reset theme selections cleanly when switching subject
  useEffect(() => {
    setSelectedThemesByDs({});
  }, [subject.matiere]);

  const toggleTheme = (sectionDs: string, theme: string) => {
    setSelectedThemesByDs((prev) => {
      const current = prev[sectionDs] ?? [];
      const exists = current.includes(theme);
      const next = exists ? current.filter((t) => t !== theme) : [...current, theme];
      return { ...prev, [sectionDs]: next };
    });
  };

  const clearThemes = (sectionDs: string) => {
    setSelectedThemesByDs((prev) => ({ ...prev, [sectionDs]: [] }));
  };

  const getExamSize = (sectionDs: string): ExamSize => examSizeByDs[sectionDs] ?? 20;

  return (
    <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 pb-24 md:pb-10">
      {/* Compact Subject Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--text)] leading-tight">
            {subject.matiere}
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--dim)] tabular-nums">
            {subject.sections.length} DS · {subject.totalQuestions} questions ·{' '}
            {subject.seenCount}/{subject.totalQuestions} vues
            {subject.successRate !== null && <> · {subject.successRate}% réussite</>}
          </p>
        </div>

        {missedQuestions.length > 0 && activeSubTab === 'revisions' && (
          <button
            type="button"
            onClick={onReplayMissed}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[var(--bad)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--bad)] transition-colors hover:bg-[var(--bad-soft)] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Rejouer erreurs ({missedQuestions.length})</span>
          </button>
        )}
      </div>

      {/* Desktop Sub-tabs: Révisions | Classement (Mobile uses thumb-zone bottom bar) */}
      <nav
        className="mt-4 hidden md:flex gap-2 border-b border-[var(--line)]"
        role="tablist"
        aria-label={`Vues de ${subject.matiere}`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'revisions'}
          onClick={() => onChangeSubTab('revisions')}
          className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3.5 py-2.5 text-[14.5px] font-medium transition-colors -mb-[1px] whitespace-nowrap ${
            activeSubTab === 'revisions'
              ? 'border-[var(--accent)] text-[var(--text)] font-semibold'
              : 'border-transparent text-[var(--dim)] hover:text-[var(--text)]'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Révisions</span>
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

      {/* ==================== TAB 1: RÉVISIONS (DS + MULTI-THÈMES) ==================== */}
      {activeSubTab === 'revisions' && (
        <div
          className={`mt-4 sm:mt-5 grid grid-cols-1 gap-4 ${
            subject.sections.length > 1 ? 'lg:grid-cols-2 lg:items-start' : ''
          }`}
        >
          {subject.sections.map((section) => {
            const selectedThemes = selectedThemesByDs[section.section_ds] ?? [];
            const examSize = getExamSize(section.section_ds);
            const effectiveExamCount = Math.min(examSize, section.totalQuestions);
            const seenPct =
              section.totalQuestions > 0
                ? Math.round((section.seenCount / section.totalQuestions) * 100)
                : 0;

            const matchingCount =
              selectedThemes.length > 0
                ? countMatchingThemeQuestions(
                    allRows,
                    subject.matiere,
                    section.section_ds,
                    selectedThemes
                  )
                : section.totalQuestions;

            return (
              <section
                key={section.section_ds}
                aria-label={`Section ${section.section_ds}`}
                className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
              >
                {/* DS Title + Progress */}
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-[var(--text)]">
                    {section.section_ds}
                  </h2>
                  <span className="font-mono-code text-[12.5px] text-[var(--dim)] tabular-nums">
                    {section.totalQuestions} question{section.totalQuestions > 1 ? 's' : ''} ·{' '}
                    {section.seenCount}/{section.totalQuestions} vues
                  </span>
                </div>

                <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${seenPct}%` }}
                  />
                </div>

                {/* Primary Action: Mode Examen DS (20 ou 30 questions aléatoires) */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLaunchSectionExam(section.section_ds, examSize)}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[14.5px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99] whitespace-nowrap"
                    aria-label={`Mode Examen DS — ${section.section_ds} (${effectiveExamCount} questions aléatoires)`}
                  >
                    <Shuffle className="h-4 w-4 shrink-0" />
                    <span>Mode Examen DS ({effectiveExamCount}q)</span>
                  </button>

                  <div
                    className="inline-flex h-[48px] shrink-0 items-center rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1"
                    role="radiogroup"
                    aria-label={`Nombre de questions pour l'examen ${section.section_ds}`}
                  >
                    {([20, 30] as const).map((size) => {
                      const active = examSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setExamSizeByDs((prev) => ({ ...prev, [section.section_ds]: size }))
                          }
                          className={`flex h-full min-w-[40px] items-center justify-center rounded-lg px-2.5 font-mono-code text-[12.5px] font-semibold transition-colors ${
                            active
                              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs border border-[var(--line)]'
                              : 'text-[var(--dim)] hover:text-[var(--text)]'
                          }`}
                        >
                          {size}q
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Select Theme Filters */}
                <div className="mt-5 pt-4 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <p className="text-[12.5px] font-medium text-[var(--dim)]">
                      Filtrer par thèmes ({section.themes.length})
                    </p>
                    {selectedThemes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearThemes(section.section_ds)}
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:underline"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Effacer ({selectedThemes.length})</span>
                      </button>
                    )}
                  </div>

                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={`Thèmes de ${section.section_ds}`}
                  >
                    {section.themes.map((item) => {
                      const active = selectedThemes.includes(item.theme);
                      return (
                        <button
                          key={item.theme}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleTheme(section.section_ds, item.theme)}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                              : 'border-[var(--line)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)]'
                          }`}
                        >
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />}
                          <span>{item.theme}</span>
                          <span className="font-mono-code text-[11.5px] text-[var(--dim)] tabular-nums">
                            {item.totalQuestions}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Launch Training CTA for Selected Themes (or Full DS) */}
                  <button
                    type="button"
                    onClick={() => onLaunchThemesQuiz(section.section_ds, selectedThemes)}
                    disabled={matchingCount === 0}
                    className={`mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-colors active:scale-[0.99] disabled:opacity-45 ${
                      selectedThemes.length > 0
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]'
                        : 'border-[var(--line)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <Play className="h-4 w-4 shrink-0" />
                    <span>
                      {selectedThemes.length > 0
                        ? `S'entraîner sur la sélection (${matchingCount} question${matchingCount > 1 ? 's' : ''})`
                        : `Réviser tout le ${section.section_ds} (${section.totalQuestions}q)`}
                    </span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ==================== TAB 2: CLASSEMENT PAR MATIÈRE ==================== */}
      {activeSubTab === 'classement' && (
        <div className="mt-4 sm:mt-5">
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
