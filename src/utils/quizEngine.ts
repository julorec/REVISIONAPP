import type {
  ChapterSummary,
  HydratedQuestion,
  ProgressMap,
  QuizMode,
  QuizQuestion,
  QuizResultSummary,
  QuizRow,
  SubjectSummary,
  UserAnswer,
} from '../types/quiz';

export const EXAM_QUESTION_LIMIT = 20;
export const DEFAULT_NUMERIC_TOLERANCE = 0.05; // ±5%

export function isChoiceQuestion(q: QuizQuestion): boolean {
  if (q.type === 'ordre') return false;
  if (q.type === 'calcul') {
    return Array.isArray(q.opts) && q.opts.length >= 2 && typeof q.ans === 'number';
  }
  return Array.isArray(q.opts) && q.opts.length >= 2;
}

export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return null;
  // Allow optional sign, decimals, scientific notation (e.g. -1.5e-3)
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function isCalculAnswerCorrect(
  userValue: number | null,
  expected: number,
  tolerance = DEFAULT_NUMERIC_TOLERANCE
): boolean {
  if (userValue === null || !Number.isFinite(userValue) || !Number.isFinite(expected)) {
    return false;
  }
  if (expected === 0) {
    return Math.abs(userValue) <= 1e-6;
  }
  const margin = Math.abs(expected) * tolerance;
  return Math.abs(userValue - expected) <= margin + 1e-9;
}

export function getCalculBounds(
  expected: number,
  tolerance = DEFAULT_NUMERIC_TOLERANCE
): { min: number; max: number } {
  const margin = Math.abs(expected) * tolerance;
  return {
    min: expected - margin,
    max: expected + margin,
  };
}

export function evaluateAnswer(q: QuizQuestion, answer: UserAnswer | null | undefined): boolean {
  if (!answer) return false;

  if (q.type === 'ordre') {
    if (answer.kind !== 'order' || !q.ordre_correct) return false;
    if (answer.sequence.length !== q.ordre_correct.length) return false;
    return q.ordre_correct.every((step, idx) => answer.sequence[idx] === step);
  }

  if (q.type === 'calcul' && !isChoiceQuestion(q)) {
    if (answer.kind !== 'numeric' || typeof q.reponse_numerique !== 'number') return false;
    const numericVal = answer.value !== null ? answer.value : parseNumericInput(answer.raw);
    return isCalculAnswerCorrect(
      numericVal,
      q.reponse_numerique,
      q.tolerance ?? DEFAULT_NUMERIC_TOLERANCE
    );
  }

  // qcm, vrai_faux, or calcul with options
  if (answer.kind !== 'choice' || typeof q.ans !== 'number') return false;
  return answer.index === q.ans;
}

/**
 * Deterministically or randomly shuffles order items so that for length >= 2,
 * the initial presentation is guaranteed NOT to match ordre_correct already.
 */
export function getShuffledOrderItems(
  correctOrder: string[],
  rng: () => number = Math.random
): string[] {
  if (correctOrder.length <= 1) return correctOrder.slice();
  const distinct = new Set(correctOrder).size;
  if (distinct <= 1) return correctOrder.slice();

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = shuffleArray(correctOrder, rng);
    const same = candidate.every((item, idx) => item === correctOrder[idx]);
    if (!same) return candidate;
  }
  // Deterministic rotation fallback if random attempts happened to match
  return [...correctOrder.slice(1), correctOrder[0]];
}

export function hydrateQuestions(rows: QuizRow[]): HydratedQuestion[] {
  const result: HydratedQuestion[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.questions.length; i++) {
      const q = row.questions[i];
      result.push({
        ...q,
        id: q.id.startsWith(`${row.id}:`) ? q.id : `${row.id}:${q.id}`,
        matiere: row.matiere,
        chapitre: row.chapitre,
        type_source: row.type_source,
        quizId: row.id,
      });
    }
  }
  return result;
}

export function buildSubjectSummaries(
  rows: QuizRow[],
  progress: ProgressMap
): SubjectSummary[] {
  const bySubject = new Map<string, HydratedQuestion[]>();
  const all = hydrateQuestions(rows);

  for (const q of all) {
    const list = bySubject.get(q.matiere) ?? [];
    list.push(q);
    bySubject.set(q.matiere, list);
  }

  const summaries: SubjectSummary[] = [];

  for (const [matiere, questions] of bySubject.entries()) {
    const chapterMap = new Map<string, ChapterSummary>();
    let coursCount = 0;
    let annalesCount = 0;
    let seenCount = 0;
    let triesCount = 0;
    let rightCount = 0;
    let missedCount = 0;

    for (const q of questions) {
      if (q.type_source === 'Cours') coursCount++;
      else annalesCount++;

      const stat = progress[q.id];
      const seen = stat && stat.tries > 0 ? 1 : 0;
      const tries = stat ? stat.tries : 0;
      const right = stat ? stat.right : 0;
      const missed = stat && stat.tries > 0 && !stat.lastOk ? 1 : 0;

      seenCount += seen;
      triesCount += tries;
      rightCount += right;
      missedCount += missed;

      const existing = chapterMap.get(q.chapitre) ?? {
        chapitre: q.chapitre,
        totalQuestions: 0,
        coursCount: 0,
        annalesCount: 0,
        seenCount: 0,
        rightCount: 0,
        triesCount: 0,
        missedCount: 0,
      };

      existing.totalQuestions += 1;
      if (q.type_source === 'Cours') existing.coursCount += 1;
      else existing.annalesCount += 1;
      existing.seenCount += seen;
      existing.rightCount += right;
      existing.triesCount += tries;
      existing.missedCount += missed;

      chapterMap.set(q.chapitre, existing);
    }

    summaries.push({
      matiere,
      totalQuestions: questions.length,
      coursCount,
      annalesCount,
      chapters: Array.from(chapterMap.values()),
      seenCount,
      triesCount,
      rightCount,
      missedCount,
      successRate: triesCount > 0 ? Math.round((rightCount / triesCount) * 100) : null,
    });
  }

  return summaries.sort(
    (a, b) => b.totalQuestions - a.totalQuestions || a.matiere.localeCompare(b.matiere, 'fr')
  );
}

export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface FilterCriteria {
  matiere: string;
  chapitre: string; // 'all' or exact chapter name
  mode: QuizMode;
  examSize?: number;
}

export function selectQuizQuestions(
  rows: QuizRow[],
  criteria: FilterCriteria,
  rng: () => number = Math.random
): HydratedQuestion[] {
  const subjectQuestions = hydrateQuestions(
    rows.filter((r) => r.matiere === criteria.matiere)
  );

  // Mode Examen Mélangé: pioche 20 questions aléatoires parmi TOUS les chapitres de la matière
  if (criteria.mode === 'exam') {
    const limit = criteria.examSize ?? EXAM_QUESTION_LIMIT;
    return shuffleArray(subjectQuestions, rng).slice(0, Math.min(limit, subjectQuestions.length));
  }

  let filtered = subjectQuestions;
  if (criteria.chapitre !== 'all') {
    filtered = filtered.filter((q) => q.chapitre === criteria.chapitre);
  }
  if (criteria.mode === 'Cours' || criteria.mode === 'Annales') {
    filtered = filtered.filter((q) => q.type_source === criteria.mode);
  }

  return filtered;
}

export function getMissedQuestionsForSubject(
  rows: QuizRow[],
  matiere: string,
  progress: ProgressMap
): HydratedQuestion[] {
  const subjectQuestions = hydrateQuestions(rows.filter((r) => r.matiere === matiere));
  return subjectQuestions.filter((q) => {
    const stat = progress[q.id];
    return stat && stat.tries > 0 && !stat.lastOk;
  });
}

export function computeQuizResult(
  questions: HydratedQuestion[],
  answers: Array<UserAnswer | null>
): QuizResultSummary {
  let score = 0;
  const missedQuestions: HydratedQuestion[] = [];
  const chapterStats = new Map<string, { right: number; total: number }>();

  questions.forEach((q, idx) => {
    const isCorrect = evaluateAnswer(q, answers[idx]);
    if (isCorrect) {
      score += 1;
    } else {
      missedQuestions.push(q);
    }

    const entry = chapterStats.get(q.chapitre) ?? { right: 0, total: 0 };
    entry.total += 1;
    if (isCorrect) entry.right += 1;
    chapterStats.set(q.chapitre, entry);
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return {
    score,
    total,
    percentage,
    missedQuestions,
    byChapter: Array.from(chapterStats.entries()).map(([chapitre, s]) => ({
      chapitre,
      right: s.right,
      total: s.total,
    })),
  };
}
