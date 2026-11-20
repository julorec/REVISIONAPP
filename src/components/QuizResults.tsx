import { useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Shuffle, Trophy, X } from 'lucide-react';
import type { HydratedQuestion, QuizResultSummary, UserAnswer } from '../types/quiz';
import { evaluateAnswer, getDifficultyStars, isChoiceQuestion } from '../utils/quizEngine';
import { CodeBlock, RichContent, SafeSvgBlock } from './RichContent';

interface QuizResultsProps {
  title: string;
  sectionDs: string;
  pseudo: string;
  scoreSavedStatus: 'saving' | 'supabase' | 'pending' | null;
  questions: HydratedQuestion[];
  answers: Array<UserAnswer | null>;
  summary: QuizResultSummary;
  onReplayMissed: (missed: HydratedQuestion[]) => void;
  onRestartSame: () => void;
  onOpenLeaderboard: () => void;
  onBackToSubject: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizResults({
  title,
  sectionDs,
  pseudo,
  scoreSavedStatus,
  questions,
  answers,
  summary,
  onReplayMissed,
  onRestartSame,
  onOpenLeaderboard,
  onBackToSubject,
}: QuizResultsProps) {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed'>('all');

  const reviewItems = questions
    .map((q, idx) => ({
      question: q,
      answer: answers[idx],
      isCorrect: evaluateAnswer(q, answers[idx]),
      number: idx + 1,
    }))
    .filter((item) => (reviewFilter === 'missed' ? !item.isCorrect : true));

  const noteSur20 =
    summary.total > 0 ? ((summary.score / summary.total) * 20).toFixed(1).replace('.', ',') : '0';

  return (
    <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8 pb-24 md:pb-10">
      {/* Main Score Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--warm)]">
          Résultats · {title}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[44px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">
              {summary.score}
            </span>
            <span className="text-[22px] font-medium tabular-nums text-[var(--dim)]">
              / {summary.total}
            </span>
          </div>

          <div className="text-right font-mono-code">
            <div className="text-[20px] font-semibold tabular-nums text-[var(--accent)]">
              +{summary.points} pts · {summary.percentage}%
            </div>
            <div className="text-[12.5px] text-[var(--dim)] tabular-nums">
              Équivalent {noteSur20} / 20
            </div>
          </div>
        </div>

        {/* Auto-saved Score Confirmation */}
        {scoreSavedStatus && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px]"
          >
            <span className="text-[var(--text)]">
              {scoreSavedStatus === 'saving' ? (
                <>Enregistrement du score pour <strong>{pseudo || 'Étudiant'}</strong>...</>
              ) : scoreSavedStatus === 'pending' ? (
                <>
                  Score enregistré hors-ligne pour <strong>{pseudo || 'Étudiant'}</strong> ({sectionDs}) :{' '}
                  <strong className="font-mono-code text-[var(--accent)]">
                    +{summary.points} pts
                  </strong>{' '}
                  — synchronisation automatique dès le retour du réseau.
                </>
              ) : (
                <>
                  Score enregistré pour <strong>{pseudo || 'Étudiant'}</strong> ({sectionDs}) :{' '}
                  <strong className="font-mono-code text-[var(--accent)]">
                    +{summary.points} pts
                  </strong>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline underline-offset-4"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Voir le classement</span>
            </button>
          </div>
        )}

        {/* Theme Breakdown */}
        {summary.byTheme.length > 0 && (
          <div className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-4">
            <p className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]">
              Détail par thème
            </p>
            {summary.byTheme.map((item) => {
              const pct = item.total > 0 ? Math.round((item.right / item.total) * 100) : 0;
              return (
                <div
                  key={item.theme}
                  className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,200px)_1fr_auto] sm:items-center sm:gap-3 text-[13.5px]"
                >
                  <span className="truncate font-medium text-[var(--text)]">{item.theme}</span>
                  <div className="h-[7px] overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct >= 70 ? 'var(--good)' : pct >= 45 ? 'var(--warm)' : 'var(--bad)',
                      }}
                    />
                  </div>
                  <span className="font-mono-code text-[12.5px] tabular-nums text-[var(--dim)]">
                    {item.right}/{item.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Primary Actions — including Rejouer mes erreurs & Classement */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-5">
          {summary.missedQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => onReplayMissed(summary.missedQuestions)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>Rejouer mes erreurs ({summary.missedQuestions.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestartSame}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--text)] hover:border-[var(--accent)] whitespace-nowrap"
          >
            <Shuffle className="h-4 w-4 shrink-0" />
            <span>Recommencer</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[13.5px] font-medium text-[var(--text)] hover:border-[var(--accent)] whitespace-nowrap"
          >
            <Trophy className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Classement</span>
          </button>

          <button
            type="button"
            onClick={onBackToSubject}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-[13.5px] font-medium text-[var(--dim)] hover:text-[var(--text)] whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Révisions</span>
          </button>
        </div>
      </div>

      {/* Detailed Correction Review */}
      <div className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-[18px] font-semibold text-[var(--text)]">
            Correction détaillée
          </h2>

          <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              aria-pressed={reviewFilter === 'all'}
              onClick={() => setReviewFilter('all')}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                reviewFilter === 'all'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--dim)] hover:text-[var(--text)]'
              }`}
            >
              Toutes ({questions.length})
            </button>
            <button
              type="button"
              aria-pressed={reviewFilter === 'missed'}
              onClick={() => setReviewFilter('missed')}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                reviewFilter === 'missed'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--dim)] hover:text-[var(--text)]'
              }`}
            >
              Erreurs ({summary.missedQuestions.length})
            </button>
          </div>
        </div>

        {reviewItems.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-[14.5px] text-[var(--good)] font-medium">
            Aucune erreur sur cette série — sans faute !
          </div>
        ) : (
          <div className="space-y-3.5">
            {reviewItems.map(({ question: q, answer, isCorrect, number }) => (
              <article
                key={`${q.id}-${number}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono-code text-[11.5px] uppercase tracking-[0.06em] text-[var(--dim)]">
                    Q{number} · {q.section_ds} · {q.themes.join(' / ')} ·{' '}
                    <span aria-label={`Difficulté ${q.difficulte} sur 3`}>
                      {getDifficultyStars(q.difficulte)}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-mono-code text-[12px] font-semibold ${
                      isCorrect ? 'text-[var(--good)]' : 'text-[var(--bad)]'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Juste
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" /> À revoir
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-2 text-[15.5px] font-semibold text-[var(--text)]">
                  <RichContent text={q.ask} />
                </div>

                {q.svg && <SafeSvgBlock svg={q.svg} />}
                {q.code && <CodeBlock code={q.code} lang={q.lang} className="mt-3" />}

                {/* Answer summary by type */}
                <div className="mt-3 space-y-1.5 text-[14px]">
                  {isChoiceQuestion(q) && q.opts && typeof q.ans === 'number' && (
                    <>
                      {!isCorrect && answer?.kind === 'choice' && q.opts[answer.index] !== undefined && (
                        <p className="text-[var(--bad)]">
                          <strong className="font-mono-code text-[12px] uppercase">Ta réponse : </strong>
                          <span className="font-mono-code mr-1">{LETTERS[answer.index]}.</span>
                          <RichContent text={q.opts[answer.index]} inline />
                        </p>
                      )}
                      <p className="text-[var(--good)]">
                        <strong className="font-mono-code text-[12px] uppercase">Réponse juste : </strong>
                        <span className="font-mono-code mr-1">{LETTERS[q.ans]}.</span>
                        <RichContent text={q.opts[q.ans]} inline />
                      </p>
                    </>
                  )}

                  {q.type === 'calcul' && !isChoiceQuestion(q) && (
                    <>
                      {answer?.kind === 'numeric' && (
                        <p className={isCorrect ? 'text-[var(--good)]' : 'text-[var(--bad)]'}>
                          <strong className="font-mono-code text-[12px] uppercase">Ta réponse : </strong>
                          <span className="font-mono-code">{answer.raw}</span>{' '}
                          {q.unite && <RichContent text={q.unite} inline />}
                        </p>
                      )}
                      {typeof q.reponse_numerique === 'number' && (
                        <p className="text-[var(--good)]">
                          <strong className="font-mono-code text-[12px] uppercase">Attendu (±5%) : </strong>
                          <span className="font-mono-code">{q.reponse_numerique}</span>{' '}
                          {q.unite && <RichContent text={q.unite} inline />}
                        </p>
                      )}
                    </>
                  )}

                  {q.type === 'ordre' && q.ordre_correct && (
                    <div className="text-[var(--good)]">
                      <strong className="font-mono-code text-[12px] uppercase block mb-1">
                        Ordre correct :
                      </strong>
                      <ol className="m-0 pl-5 list-decimal space-y-0.5 text-[var(--text)]">
                        {q.ordre_correct.map((step, i) => (
                          <li key={i}>
                            <RichContent text={step} inline />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-[var(--surface-2)] px-3.5 py-2.5 text-[13.5px] text-[var(--text)]">
                  <RichContent text={q.why} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
