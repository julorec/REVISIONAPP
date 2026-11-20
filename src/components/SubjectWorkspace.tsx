import { ArrowLeft, Play, RotateCcw, Shuffle } from 'lucide-react';
import type { HydratedQuestion, QuizMode, SubjectSummary } from '../types/quiz';

interface SubjectWorkspaceProps {
  subject: SubjectSummary;
  selectedChapter: string;
  selectedMode: QuizMode;
  matchingCount: number;
  missedQuestions: HydratedQuestion[];
  onChangeChapter: (chapitre: string) => void;
  onChangeMode: (mode: QuizMode) => void;
  onStartQuiz: () => void;
  onReplayMissed: () => void;
  onBack: () => void;
}

export function SubjectWorkspace({
  subject,
  selectedChapter,
  selectedMode,
  matchingCount,
  missedQuestions,
  onChangeChapter,
  onChangeMode,
  onStartQuiz,
  onReplayMissed,
  onBack,
}: SubjectWorkspaceProps) {
  const isExamMode = selectedMode === 'exam';
  const examSize = Math.min(20, subject.totalQuestions);

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-[var(--accent)] hover:underline underline-offset-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Retour au catalogue</span>
      </button>

      <div className="mt-3 border-b border-[var(--line)] pb-4">
        <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--warm)]">
          {subject.totalQuestions} questions · {subject.coursCount} Cours · {subject.annalesCount} Annales
        </p>
        <h1 className="mt-1 text-[24px] sm:text-[27px] font-semibold tracking-[-0.015em] text-[var(--text)]">
          {subject.matiere}
        </h1>
      </div>

      {/* Mode & Type Filter */}
      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--dim)]">
          Mode &amp; source
        </p>

        <div
          className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Filtrer par type ou mode examen"
        >
          {(
            [
              { id: 'all', label: 'Tout', sub: `${subject.totalQuestions} q.` },
              { id: 'Cours', label: 'Cours', sub: `${subject.coursCount} q.` },
              { id: 'Annales', label: 'Annales', sub: `${subject.annalesCount} q.` },
              { id: 'exam', label: 'Examen Mélangé', sub: `${examSize} q. aléatoires` },
            ] as const
          ).map((item) => {
            const active = selectedMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeMode(item.id)}
                className={`flex min-h-[54px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                  {item.id === 'exam' && <Shuffle className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
                  {item.label}
                </span>
                <span className="font-mono-code text-[11.5px] text-[var(--dim)] tabular-nums">
                  {item.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chapter Filter */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--dim)]">
              Chapitre
            </p>
            {isExamMode && (
              <span className="text-[12px] text-[var(--dim)]">
                Tous les chapitres sont mélangés en mode examen
              </span>
            )}
          </div>

          <div
            className={`mt-2.5 flex flex-wrap gap-2 ${isExamMode ? 'opacity-50 pointer-events-none' : ''}`}
            role="group"
            aria-label="Filtrer par chapitre"
          >
            <button
              type="button"
              aria-pressed={selectedChapter === 'all'}
              onClick={() => onChangeChapter('all')}
              className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                selectedChapter === 'all'
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
              }`}
            >
              Tous les chapitres
              <span className="ml-1.5 font-mono-code text-[12px] opacity-80 tabular-nums">
                {subject.totalQuestions}
              </span>
            </button>

            {subject.chapters.map((ch) => {
              const active = selectedChapter === ch.chapitre;
              return (
                <button
                  key={ch.chapitre}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeChapter(ch.chapitre)}
                  className={`min-h-[40px] rounded-lg border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]'
                  }`}
                >
                  {ch.chapitre}
                  <span className="ml-1.5 font-mono-code text-[12px] opacity-80 tabular-nums">
                    {ch.totalQuestions}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Launch Bar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14.5px] font-medium text-[var(--text)]">
              {isExamMode
                ? `Examen mélangé : ${examSize} questions tirées aléatoirement`
                : matchingCount > 0
                  ? `${matchingCount} question${matchingCount > 1 ? 's' : ''} prête${matchingCount > 1 ? 's' : ''}`
                  : 'Aucune question ne correspond à ce filtre'}
            </p>
            <p className="text-[12.5px] text-[var(--dim)]">
              Correction immédiate avec explication détaillée, formules KaTeX et coloration syntaxique.
            </p>
          </div>

          <button
            type="button"
            disabled={matchingCount === 0}
            onClick={onStartQuiz}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[14.5px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-45 whitespace-nowrap"
          >
            {isExamMode ? (
              <Shuffle className="h-4 w-4 shrink-0" />
            ) : (
              <Play className="h-4 w-4 shrink-0" />
            )}
            <span>{isExamMode ? `Lancer l'examen (${examSize}q)` : 'Lancer le quiz'}</span>
          </button>
        </div>

        {missedQuestions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
            <span className="text-[13.5px] text-[var(--text)]">
              Vous avez{' '}
              <strong className="font-mono-code text-[var(--bad)] tabular-nums">
                {missedQuestions.length}
              </strong>{' '}
              question{missedQuestions.length > 1 ? 's' : ''} ratée{missedQuestions.length > 1 ? 's' : ''} récemment dans cette matière.
            </span>
            <button
              type="button"
              onClick={onReplayMissed}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--bad)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--bad)] transition-colors hover:bg-[var(--bad-soft)] whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Rejouer mes erreurs ({missedQuestions.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Chapter mastery table */}
      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--dim)]">
          Détail par chapitre
        </p>
        <div className="mt-3 divide-y divide-[var(--line)]">
          {subject.chapters.map((ch) => {
            const pct = ch.triesCount > 0 ? Math.round((ch.rightCount / ch.triesCount) * 100) : null;
            return (
              <div
                key={ch.chapitre}
                className="flex flex-col gap-1.5 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[14.5px] font-medium text-[var(--text)]">{ch.chapitre}</p>
                  <p className="text-[12.5px] text-[var(--dim)]">
                    {ch.coursCount} Cours · {ch.annalesCount} Annales · {ch.seenCount}/{ch.totalQuestions} vues
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:w-52">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct ?? 0}%`,
                        backgroundColor:
                          pct === null
                            ? 'var(--line)'
                            : pct >= 70
                              ? 'var(--good)'
                              : pct >= 45
                                ? 'var(--warm)'
                                : 'var(--bad)',
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono-code text-[12.5px] text-[var(--dim)] tabular-nums">
                    {pct !== null ? `${pct}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
