import { ArrowRight, RefreshCw, Shuffle } from 'lucide-react';
import type { SubjectSummary } from '../types/quiz';

interface CatalogueHomeProps {
  subjects: SubjectSummary[];
  loading: boolean;
  onSelectSubject: (matiere: string) => void;
  onQuickExam: (matiere: string) => void;
  onRefresh: () => void;
}

export function CatalogueHome({
  subjects,
  loading,
  onSelectSubject,
  onQuickExam,
  onRefresh,
}: CatalogueHomeProps) {
  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalSeen = subjects.reduce((sum, s) => sum + s.seenCount, 0);
  const totalMissed = subjects.reduce((sum, s) => sum + s.missedCount, 0);

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--line)] pb-5">
        <div className="space-y-1.5">
          <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--warm)]">
            Révisions multi-matières · QCM · Calcul · Ordre
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[var(--text)] leading-tight">
            Catalogue des matières
          </h1>
          <p className="text-[14.5px] text-[var(--dim)] max-w-2xl">
            Choisissez une matière pour filtrer par chapitre, réviser le cours ou les annales, ou lancer un examen blanc mélangé de 20 questions.
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="flex items-baseline gap-5 text-sm">
            <div>
              <div className="font-mono-code text-[11px] uppercase tracking-[0.06em] text-[var(--dim)]">
                Banque
              </div>
              <div className="font-mono-code text-lg font-semibold tabular-nums text-[var(--text)]">
                {totalQuestions} <span className="text-xs font-normal text-[var(--dim)]">quest.</span>
              </div>
            </div>
            <div>
              <div className="font-mono-code text-[11px] uppercase tracking-[0.06em] text-[var(--dim)]">
                Vues
              </div>
              <div className="font-mono-code text-lg font-semibold tabular-nums text-[var(--text)]">
                {totalSeen}
                <span className="text-xs font-normal text-[var(--dim)]">/{totalQuestions}</span>
              </div>
            </div>
            {totalMissed > 0 && (
              <div>
                <div className="font-mono-code text-[11px] uppercase tracking-[0.06em] text-[var(--dim)]">
                  À revoir
                </div>
                <div className="font-mono-code text-lg font-semibold tabular-nums text-[var(--bad)]">
                  {totalMissed}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-50"
            aria-label="Actualiser le catalogue depuis Supabase"
            title="Actualiser depuis Supabase"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && subjects.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
              <div className="mt-3 h-6 w-48 rounded bg-[var(--surface-2)]" />
              <div className="mt-4 h-3 w-64 rounded bg-[var(--surface-2)]" />
              <div className="mt-8 h-2 w-full rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--text)]">Aucune matière disponible</h2>
          <p className="mt-2 text-sm text-[var(--dim)]">
            Utilisez le bouton Import dans la barre supérieure pour ajouter votre premier jeu de questions JSON.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {subjects.map((subject) => {
            const seenPct =
              subject.totalQuestions > 0
                ? Math.round((subject.seenCount / subject.totalQuestions) * 100)
                : 0;
            const examCount = Math.min(20, subject.totalQuestions);

            return (
              <article
                key={subject.matiere}
                className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--warm)]">
                      {subject.chapters.length}{' '}
                      {subject.chapters.length > 1 ? 'chapitres' : 'chapitre'}
                    </p>
                    <p className="font-mono-code text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                      {subject.totalQuestions} questions
                    </p>
                  </div>

                  <h2 className="mt-1.5 text-[19px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                    {subject.matiere}
                  </h2>

                  <p className="mt-1.5 text-[13.5px] text-[var(--dim)]">
                    {subject.coursCount} Cours · {subject.annalesCount} Annales
                    {subject.successRate !== null && (
                      <> · {subject.successRate}% de réussite</>
                    )}
                    {subject.missedCount > 0 && (
                      <>
                        {' '}
                        · <span className="text-[var(--bad)] font-medium">{subject.missedCount} erreur{subject.missedCount > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </p>

                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[12px] font-mono-code text-[var(--dim)] mb-1.5">
                      <span>Progression</span>
                      <span className="tabular-nums">
                        {subject.seenCount}/{subject.totalQuestions} ({seenPct}%)
                      </span>
                    </div>
                    <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${seenPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => onSelectSubject(subject.matiere)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] whitespace-nowrap"
                  >
                    <span>Ouvrir et filtrer</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickExam(subject.matiere)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-transparent px-3.5 py-2 text-[13.5px] font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
                    aria-label={`Lancer un examen mélangé de ${examCount} questions pour ${subject.matiere}`}
                  >
                    <Shuffle className="h-3.5 w-3.5 shrink-0" />
                    <span>Examen {examCount}q</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
