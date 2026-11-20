import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ListOrdered,
  MousePointerClick,
  RotateCcw,
  X,
} from 'lucide-react';
import type { HydratedQuestion, UserAnswer } from '../types/quiz';
import {
  DEFAULT_NUMERIC_TOLERANCE,
  evaluateAnswer,
  getCalculBounds,
  getDifficultyLabel,
  getShuffledOrderItems,
  isChoiceQuestion,
  parseNumericInput,
} from '../utils/quizEngine';
import { CodeBlock, RichContent, SafeSvgBlock } from './RichContent';

interface QuizSessionProps {
  title: string;
  questions: HydratedQuestion[];
  onRecordAnswer: (questionId: string, isCorrect: boolean) => void;
  onFinish: (answers: Array<UserAnswer | null>) => void;
  onExit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function formatFrNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toPrecision(5)).toString().replace('.', ',');
}

function getTypeLabel(q: HydratedQuestion): string {
  if (q.type === 'vrai_faux') return 'Vrai / Faux';
  if (q.type === 'ordre') return 'Ordre';
  if (q.type === 'calcul') {
    return isChoiceQuestion(q) ? 'Calcul · QCM' : 'Calcul ±5%';
  }
  return 'QCM';
}

export function QuizSession({
  title,
  questions,
  onRecordAnswer,
  onFinish,
  onExit,
}: QuizSessionProps) {
  const [index, setIndex] = useState(0);
  // Confirmed/submitted answers per question index
  const [submittedAnswers, setSubmittedAnswers] = useState<Array<UserAnswer | null>>(() =>
    questions.map(() => null)
  );
  // Draft state for current question before validation
  const [draftChoice, setDraftChoice] = useState<number | null>(null);
  const [draftNumeric, setDraftNumeric] = useState<string>('');
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  // For sequential click mode in 'ordre' questions
  const [orderClickMode, setOrderClickMode] = useState(false);
  const [sequentialPicked, setSequentialPicked] = useState<string[]>([]);
  const [numericError, setNumericError] = useState<string | null>(null);
  const [isNumericFocused, setIsNumericFocused] = useState(false);

  // Precompute deterministic non-solved shuffled pools for every 'ordre' question in this session
  const initialOrderPools = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const q of questions) {
      if (q.type === 'ordre' && q.ordre_correct) {
        map[q.id] = getShuffledOrderItems(q.ordre_correct);
      }
    }
    return map;
  }, [questions]);

  const current = questions[index];
  const submitted = submittedAnswers[index];
  const isLocked = submitted !== null;

  // Reset or restore draft when changing question index
  useEffect(() => {
    const q = questions[index];
    const existing = submittedAnswers[index];
    setNumericError(null);
    setOrderClickMode(false);
    setSequentialPicked([]);

    if (!q) return;

    if (existing) {
      if (existing.kind === 'choice') setDraftChoice(existing.index);
      if (existing.kind === 'numeric') setDraftNumeric(existing.raw);
      if (existing.kind === 'order') setDraftOrder(existing.sequence);
    } else {
      setDraftChoice(null);
      setDraftNumeric('');
      if (q.type === 'ordre' && q.ordre_correct) {
        setDraftOrder(initialOrderPools[q.id] ?? q.ordre_correct.slice());
      } else {
        setDraftOrder([]);
      }
    }
  }, [index, questions, submittedAnswers, initialOrderPools]);

  const liveScore = useMemo(() => {
    return questions.reduce((acc, q, idx) => {
      const ans = submittedAnswers[idx];
      if (!ans) return acc;
      return acc + (evaluateAnswer(q, ans) ? 1 : 0);
    }, 0);
  }, [questions, submittedAnswers]);

  const answeredCount = useMemo(
    () => submittedAnswers.filter((a) => a !== null).length,
    [submittedAnswers]
  );

  const canSubmit = useMemo(() => {
    if (!current || isLocked) return false;
    if (current.type === 'ordre') {
      if (orderClickMode) {
        return (
          !!current.ordre_correct &&
          sequentialPicked.length === current.ordre_correct.length
        );
      }
      return draftOrder.length > 0;
    }
    if (current.type === 'calcul' && !isChoiceQuestion(current)) {
      return draftNumeric.trim().length > 0;
    }
    return draftChoice !== null;
  }, [current, isLocked, orderClickMode, sequentialPicked, draftOrder, draftNumeric, draftChoice]);

  const handleValidate = useCallback(() => {
    if (!current || isLocked) return;

    let finalAnswer: UserAnswer | null = null;

    if (current.type === 'ordre') {
      const seq = orderClickMode ? sequentialPicked : draftOrder;
      if (!current.ordre_correct || seq.length !== current.ordre_correct.length) return;
      finalAnswer = { kind: 'order', sequence: seq.slice() };
    } else if (current.type === 'calcul' && !isChoiceQuestion(current)) {
      const parsed = parseNumericInput(draftNumeric);
      if (parsed === null) {
        setNumericError('Veuillez saisir une valeur numérique valide (ex : 1591,5 ou 1.5e-3).');
        return;
      }
      setNumericError(null);
      finalAnswer = { kind: 'numeric', raw: draftNumeric.trim(), value: parsed };
    } else {
      if (draftChoice === null) return;
      finalAnswer = { kind: 'choice', index: draftChoice };
    }

    const ok = evaluateAnswer(current, finalAnswer);
    setSubmittedAnswers((prev) => {
      const next = prev.slice();
      next[index] = finalAnswer;
      return next;
    });
    onRecordAnswer(current.id, ok);
  }, [
    current,
    isLocked,
    orderClickMode,
    sequentialPicked,
    draftOrder,
    draftNumeric,
    draftChoice,
    index,
    onRecordAnswer,
  ]);

  const handleNext = useCallback(() => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFinish(submittedAnswers);
    }
  }, [index, questions.length, onFinish, submittedAnswers]);

  const handlePrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [index]);

  // Keyboard shortcuts (1-4 / A-D for choices, Enter to validate or advance)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Enter') {
        if (isLocked) {
          e.preventDefault();
          handleNext();
        } else if (canSubmit && (!isTyping || target?.tagName === 'INPUT')) {
          e.preventDefault();
          handleValidate();
        }
        return;
      }

      if (isTyping || isLocked || !current || !isChoiceQuestion(current) || !current.opts) return;

      const keyLower = e.key.toLowerCase();
      let idx = -1;
      if (/^[1-6]$/.test(keyLower)) {
        idx = Number(keyLower) - 1;
      } else if (['a', 'b', 'c', 'd', 'e', 'f'].includes(keyLower)) {
        idx = LETTERS.findIndex((l) => l.toLowerCase() === keyLower);
      }

      if (idx >= 0 && idx < current.opts.length) {
        e.preventDefault();
        setDraftChoice(idx);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, isLocked, canSubmit, handleValidate, handleNext]);

  if (!current) return null;

  const isCorrect = isLocked ? evaluateAnswer(current, submitted) : null;
  const progressPct = Math.round(((index + 1) / questions.length) * 100);
  const poolItems = initialOrderPools[current.id] ?? current.ordre_correct ?? [];

  const moveOrderItem = (fromIdx: number, delta: -1 | 1) => {
    const toIdx = fromIdx + delta;
    if (toIdx < 0 || toIdx >= draftOrder.length) return;
    setDraftOrder((prev) => {
      const copy = prev.slice();
      [copy[fromIdx], copy[toIdx]] = [copy[toIdx], copy[fromIdx]];
      return copy;
    });
  };

  const toggleSequentialPick = (item: string) => {
    if (isLocked) return;
    setSequentialPicked((prev) => {
      if (prev.includes(item)) {
        return prev.filter((x) => x !== item);
      }
      return [...prev, item];
    });
  };

  const expectedOrder = current.ordre_correct ?? [];
  const displayedOrder = isLocked && submitted?.kind === 'order' ? submitted.sequence : draftOrder;
  const isCalculNumeric = current.type === 'calcul' && !isChoiceQuestion(current);
  // Avoid fixed bottom-0 bar during keyboard input (especially calcul numeric entry)
  const useInlineMobileControls = isCalculNumeric || isNumericFocused;

  return (
    <section
      className={`mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7 overflow-y-auto overscroll-contain ${
        useInlineMobileControls ? 'pb-12 sm:pb-10' : 'pb-24 sm:pb-10'
      }`}
    >
      {/* Top Quiz Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 text-[12.5px] font-mono-code text-[var(--dim)] mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 -ml-1.5 text-[var(--dim)] hover:text-[var(--text)] transition-colors shrink-0"
              aria-label="Quitter le quiz"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quitter</span>
            </button>
            <span className="text-[var(--line)]">·</span>
            <span className="truncate">{title}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 tabular-nums">
            <span className="text-[var(--good)] font-semibold">
              {liveScore} juste{liveScore > 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-[var(--text)]">
              {index + 1} / {questions.length}
            </span>
          </div>
        </div>

        <div
          className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-label={`Question ${index + 1} sur ${questions.length}`}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        {/* Kicker metadata + discreet difficulty star badge */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono-code text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--warm)]">
            {current.section_ds} · {current.themes.join(' / ')} · {getTypeLabel(current)}
          </p>
          {(() => {
            const diff = getDifficultyLabel(current.difficulte);
            return (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono-code text-[11px] font-medium text-[var(--dim)] shrink-0"
                title={`Difficulté ${current.difficulte}/3 — ${diff.full}`}
                aria-label={`Difficulté ${current.difficulte} sur 3 : ${diff.full}`}
              >
                <span aria-hidden="true">{diff.stars}</span>
                <span className="hidden sm:inline">{diff.short}</span>
              </span>
            );
          })()}
        </div>

        {/* Prompt */}
        <div className="mt-2.5 text-[16.5px] sm:text-[17.5px] font-semibold leading-[1.5] text-[var(--text)]">
          <RichContent text={current.ask} />
        </div>

        {/* Optional SVG Diagram */}
        {current.svg && <SafeSvgBlock svg={current.svg} />}

        {/* Optional Syntax-Highlighted Code Block (C, VHDL, Assembly, Python) */}
        {current.code && (
          <CodeBlock code={current.code} lang={current.lang} className="mt-3.5" />
        )}

        {/* Optional stdin callout */}
        {current.stdin && (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 font-mono-code text-[13px] text-[var(--text)]">
            <span className="mr-2 font-semibold text-[var(--warm)]">stdin :</span>
            <span>{current.stdin}</span>
          </div>
        )}

        {/* ==================== 1. QCM / VRAI-FAUX / CALCUL WITH OPTIONS ==================== */}
        {isChoiceQuestion(current) && current.opts && (
          <ul
            className="mt-4 grid grid-cols-1 gap-2.5 p-0 m-0 list-none"
            role="radiogroup"
            aria-label="Choix de réponse"
          >
            {current.opts.map((opt, optIdx) => {
              const isPicked =
                isLocked && submitted?.kind === 'choice'
                  ? submitted.index === optIdx
                  : draftChoice === optIdx;
              const isRightOpt = current.ans === optIdx;

              let stateClasses =
                'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]';
              if (isLocked) {
                if (isRightOpt) {
                  stateClasses = 'border-[var(--good)] bg-[var(--good-soft)]';
                } else if (isPicked && !isRightOpt) {
                  stateClasses = 'border-[var(--bad)] bg-[var(--bad-soft)]';
                } else {
                  stateClasses = 'border-[var(--line)] bg-[var(--surface)] opacity-75';
                }
              } else if (isPicked) {
                stateClasses = 'border-[var(--accent)] bg-[var(--accent-soft)]';
              }

              return (
                <li key={optIdx}>
                  <button
                    type="button"
                    disabled={isLocked}
                    role="radio"
                    aria-checked={isPicked}
                    onClick={() => setDraftChoice(optIdx)}
                    className={`flex min-h-[48px] w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors disabled:cursor-default ${stateClasses}`}
                  >
                    <span className="mt-0.5 w-5 shrink-0 font-mono-code text-[12.5px] font-semibold text-[var(--dim)]">
                      {LETTERS[optIdx] ?? optIdx + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-[14.5px] leading-[1.5] text-[var(--text)]">
                      <RichContent text={opt} inline />
                    </span>
                    {isLocked && isRightOpt && (
                      <span className="ml-2 shrink-0 inline-flex items-center gap-1 font-mono-code text-[12px] font-semibold text-[var(--good)]">
                        <Check className="h-3.5 w-3.5" />
                        juste
                      </span>
                    )}
                    {isLocked && isPicked && !isRightOpt && (
                      <span className="ml-2 shrink-0 inline-flex items-center gap-1 font-mono-code text-[12px] font-semibold text-[var(--bad)]">
                        <X className="h-3.5 w-3.5" />
                        ta réponse
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* ==================== 2. CALCUL (NUMERIC INPUT ±5%) ==================== */}
        {current.type === 'calcul' && !isChoiceQuestion(current) && (
          <div className="mt-5">
            <label
              htmlFor={`calc-input-${current.id}`}
              className="block font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)] mb-2"
            >
              Réponse numérique (tolérance ±
              {Math.round((current.tolerance ?? DEFAULT_NUMERIC_TOLERANCE) * 100)} %)
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <input
                id={`calc-input-${current.id}`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                disabled={isLocked}
                value={draftNumeric}
                onFocus={(e) => {
                  setIsNumericFocused(true);
                  const el = e.currentTarget;
                  setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 120);
                }}
                onBlur={() => setIsNumericFocused(false)}
                onChange={(e) => {
                  setDraftNumeric(e.target.value);
                  if (numericError) setNumericError(null);
                }}
                placeholder="Ex : 1591,5"
                className={`min-h-[48px] flex-1 min-w-[160px] rounded-lg border px-4 py-2.5 font-mono-code text-[18px] font-semibold text-[var(--text)] transition-colors disabled:opacity-90 ${
                  isLocked
                    ? isCorrect
                      ? 'border-[var(--good)] bg-[var(--good-soft)]'
                      : 'border-[var(--bad)] bg-[var(--bad-soft)]'
                    : 'border-[var(--line)] bg-[var(--surface)] focus:border-[var(--accent)]'
                }`}
              />
              {current.unite && (
                <div className="font-mono-code text-[15px] font-medium text-[var(--dim)] px-1">
                  <RichContent text={current.unite} inline />
                </div>
              )}
            </div>

            {numericError && (
              <p className="mt-2 text-[13px] font-medium text-[var(--bad)]" role="alert">
                {numericError}
              </p>
            )}

            {isLocked && typeof current.reponse_numerique === 'number' && (
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[14px] text-[var(--text)]">
                <span className="text-[var(--dim)]">Valeur attendue : </span>
                <strong className="font-mono-code text-[var(--text)]">
                  {formatFrNumber(current.reponse_numerique)}
                </strong>
                {current.unite && (
                  <span className="ml-1 font-mono-code text-[var(--dim)]">
                    <RichContent text={current.unite} inline />
                  </span>
                )}
                {current.reponse_numerique !== 0 && (() => {
                  const bounds = getCalculBounds(
                    current.reponse_numerique,
                    current.tolerance ?? DEFAULT_NUMERIC_TOLERANCE
                  );
                  return (
                    <span className="ml-2 text-[12.5px] font-mono-code text-[var(--dim)]">
                      (intervalle accepté : [{formatFrNumber(bounds.min)} ;{' '}
                      {formatFrNumber(bounds.max)}])
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. ORDRE (REORDERING: ARROWS OR SEQUENTIAL CLICK) ==================== */}
        {current.type === 'ordre' && expectedOrder.length > 0 && (
          <div className="mt-5">
            {!isLocked && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono-code text-[12px] uppercase tracking-[0.06em] text-[var(--dim)]">
                  {orderClickMode
                    ? `Cliquez les étapes dans l'ordre (${sequentialPicked.length}/${expectedOrder.length})`
                    : "Réordonnez avec les flèches haut / bas"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderClickMode((prev) => !prev);
                      setSequentialPicked([]);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[12.5px] font-medium text-[var(--text)] hover:border-[var(--accent)] transition-colors"
                  >
                    {orderClickMode ? (
                      <>
                        <ListOrdered className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>Mode flèches</span>
                      </>
                    ) : (
                      <>
                        <MousePointerClick className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>Mode clic séquentiel</span>
                      </>
                    )}
                  </button>

                  {orderClickMode && sequentialPicked.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSequentialPicked([])}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--dim)] hover:text-[var(--text)]"
                      aria-label="Réinitialiser la séquence choisie"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Effacer</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sequential Click Mode UI (unlocked) */}
            {!isLocked && orderClickMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {poolItems.map((item, idx) => {
                    const pickRank = sequentialPicked.indexOf(item);
                    const picked = pickRank !== -1;
                    return (
                      <button
                        key={`${item}-${idx}`}
                        type="button"
                        onClick={() => toggleSequentialPick(item)}
                        aria-pressed={picked}
                        className={`flex min-h-[48px] w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                          picked
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono-code text-[12.5px] font-semibold tabular-nums ${
                            picked
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                              : 'border border-[var(--line)] bg-[var(--surface-2)] text-[var(--dim)]'
                          }`}
                        >
                          {picked ? pickRank + 1 : '·'}
                        </span>
                        <span className="min-w-0 flex-1 text-[14.5px] text-[var(--text)]">
                          <RichContent text={item} inline />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Arrow Up/Down Mode UI (and locked review state) */
              <ol className="space-y-2 m-0 p-0 list-none">
                {displayedOrder.map((item, pos) => {
                  const slotCorrect = isLocked && expectedOrder[pos] === item;
                  const slotWrong = isLocked && expectedOrder[pos] !== item;

                  return (
                    <li
                      key={`${item}-${pos}`}
                      className={`flex min-h-[52px] items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                        slotCorrect
                          ? 'border-[var(--good)] bg-[var(--good-soft)]'
                          : slotWrong
                            ? 'border-[var(--bad)] bg-[var(--bad-soft)]'
                            : 'border-[var(--line)] bg-[var(--surface)]'
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] font-mono-code text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                        {pos + 1}
                      </span>

                      <span className="min-w-0 flex-1 text-[14.5px] leading-[1.45] text-[var(--text)]">
                        <RichContent text={item} inline />
                      </span>

                      {!isLocked ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={pos === 0}
                            onClick={() => moveOrderItem(pos, -1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-35"
                            aria-label={`Monter l'étape ${pos + 1}`}
                            title="Monter"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={pos === displayedOrder.length - 1}
                            onClick={() => moveOrderItem(pos, 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-35"
                            aria-label={`Descendre l'étape ${pos + 1}`}
                            title="Descendre"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`shrink-0 font-mono-code text-[12px] font-semibold ${
                            slotCorrect ? 'text-[var(--good)]' : 'text-[var(--bad)]'
                          }`}
                        >
                          {slotCorrect ? '✓' : '✗'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Expected correct sequence shown if user made an error */}
            {isLocked && !isCorrect && (
              <div className="mt-3.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                <p className="font-mono-code text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--good)] mb-2">
                  Séquence attendue
                </p>
                <ol className="m-0 space-y-1.5 pl-5 text-[14px] text-[var(--text)] list-decimal">
                  {expectedOrder.map((step, i) => (
                    <li key={i}>
                      <RichContent text={step} inline />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ==================== IMMEDIATE EXPLANATION PANEL ==================== */}
        {isLocked && (
          <div
            className={`mt-5 rounded-lg border p-4 ${
              isCorrect
                ? 'border-[var(--good)]/40 bg-[var(--good-soft)]/50'
                : 'border-[var(--bad)]/40 bg-[var(--bad-soft)]/50'
            }`}
            role="status"
            aria-live="polite"
          >
            <p
              className={`font-mono-code text-[12px] font-semibold uppercase tracking-[0.06em] mb-1.5 ${
                isCorrect ? 'text-[var(--good)]' : 'text-[var(--bad)]'
              }`}
            >
              {isCorrect ? 'Bonne réponse · Explication' : 'Correction · Explication'}
            </p>
            <div className="text-[14.5px] leading-[1.6] text-[var(--text)]">
              <RichContent text={current.why} />
            </div>
          </div>
        )}

        {/* Footer Controls (always visible on desktop, and inline on mobile during calcul/keyboard input) */}
        <div
          className={`mt-6 ${
            useInlineMobileControls ? 'flex' : 'hidden sm:flex'
          } items-center justify-between gap-3 pt-4 border-t border-[var(--line)]`}
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={handlePrev}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 sm:px-4 py-2 text-[14px] font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédente</span>
          </button>

          <div className="hidden sm:block text-[12px] font-mono-code text-[var(--dim)]">
            {answeredCount}/{questions.length} validée{answeredCount > 1 ? 's' : ''}
          </div>

          {!isLocked ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleValidate}
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-45"
            >
              <span>Valider</span>
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-[14.5px] font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
            >
              <span>
                {index + 1 < questions.length ? 'Question suivante' : 'Voir mes résultats'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>

      {/* Mobile Sticky Bottom Bar (strictly omitted during calcul / virtual keyboard input) */}
      {!useInlineMobileControls && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex sm:hidden items-center justify-between gap-2.5 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-sm px-4 pt-2.5 pb-safe">
          <button
            type="button"
            disabled={index === 0}
            onClick={handlePrev}
            className="inline-flex min-h-[46px] items-center justify-center gap-1 rounded-lg border border-[var(--line)] px-3.5 text-[14px] font-medium text-[var(--text)] disabled:opacity-40"
            aria-label="Question précédente"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Préc.</span>
          </button>

          {!isLocked ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleValidate}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-ink)] disabled:opacity-45"
            >
              <span>Valider</span>
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-[var(--accent-ink)]"
            >
              <span>{index + 1 < questions.length ? 'Suivante' : 'Résultats'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
