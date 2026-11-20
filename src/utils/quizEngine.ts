import type {
  DifficultyLevel,
  ExamSize,
  HydratedQuestion,
  ProgressMap,
  QuizCountOption,
  QuizMode,
  QuizQuestion,
  QuizResultSummary,
  QuizRow,
  SectionSummary,
  SubjectRecord,
  SubjectSummary,
  ThemeSummary,
  TrainingMode,
  UserAnswer,
} from '../types/quiz';
import { computeQuizPoints } from './leaderboard';
import { DEFAULT_DIFFICULTY, normalizeDifficulty, normalizeThemes } from './quizNormalizer';

export const EXAM_QUESTION_LIMIT: ExamSize = 20;
export const DEFAULT_NUMERIC_TOLERANCE = 0.05; // ±5%
export const DEFAULT_SECTION_DS = 'DS 1';

export function slugifySubjectName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'matiere';
}

export function normalizeDifficultySafe(raw: unknown): DifficultyLevel {
  const res = normalizeDifficulty(raw);
  return res.valid ? res.value : DEFAULT_DIFFICULTY;
}

export function getDifficultyStars(level: DifficultyLevel): string {
  if (level === 1) return '⭐';
  if (level === 3) return '⭐⭐⭐';
  return '⭐⭐';
}

export function getDifficultyLabel(level: DifficultyLevel): {
  short: string;
  full: string;
  stars: string;
} {
  if (level === 1) {
    return { short: 'Bases', full: 'Facile · Bases du cours', stars: '⭐' };
  }
  if (level === 3) {
    return { short: 'Partiel', full: 'Difficile · Niveau Partiel & Pièges', stars: '⭐⭐⭐' };
  }
  return { short: 'TD', full: 'Intermédiaire · Application TD', stars: '⭐⭐' };
}

export function normalizeSectionDs(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return DEFAULT_SECTION_DS;
}

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

  if (answer.kind !== 'choice' || typeof q.ans !== 'number') return false;
  return answer.index === q.ans;
}

export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  return [...correctOrder.slice(1), correctOrder[0]];
}

export function hydrateQuestions(rows: QuizRow[]): HydratedQuestion[] {
  const result: HydratedQuestion[] = [];
  for (const row of rows) {
    const sectionDs = normalizeSectionDs(row.section_ds);
    for (let i = 0; i < row.questions.length; i++) {
      const q = row.questions[i];
      const themes = normalizeThemes(q.themes, q.concept || row.chapitre);
      const difficulte = normalizeDifficultySafe(q.difficulte);
      result.push({
        ...q,
        themes,
        difficulte,
        id: q.id.startsWith(`${row.id}:`) ? q.id : `${row.id}:${q.id}`,
        matiere: row.matiere,
        section_ds: sectionDs,
        chapitre: row.chapitre || 'Banque générale',
        quizId: row.id,
      });
    }
  }
  return result;
}

/**
 * Extracts all unique themes from a section's questions (handling multi-theme questions),
 * sorted by question count descending then alphabetically.
 */
export function extractSectionThemes(
  questions: HydratedQuestion[],
  progress: ProgressMap
): ThemeSummary[] {
  const map = new Map<string, ThemeSummary>();

  for (const q of questions) {
    const stat = progress[q.id];
    const seen = stat && stat.tries > 0 ? 1 : 0;
    const missed = stat && stat.tries > 0 && !stat.lastOk ? 1 : 0;

    const seenInQuestion = new Set<string>();
    for (const rawTheme of q.themes) {
      const theme = rawTheme.trim();
      if (!theme) continue;
      const key = theme.toLowerCase();
      if (seenInQuestion.has(key)) continue;
      seenInQuestion.add(key);

      const entry = map.get(key) ?? {
        theme,
        totalQuestions: 0,
        seenCount: 0,
        missedCount: 0,
      };
      entry.totalQuestions += 1;
      entry.seenCount += seen;
      entry.missedCount += missed;
      map.set(key, entry);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalQuestions - a.totalQuestions || a.theme.localeCompare(b.theme, 'fr')
  );
}

/**
 * Filters questions by one or more selected themes (union semantics, no duplicates).
 */
export function filterQuestionsByThemes(
  questions: HydratedQuestion[],
  selectedThemes: string[]
): HydratedQuestion[] {
  if (selectedThemes.length === 0) return questions;
  const targets = new Set(selectedThemes.map((t) => t.trim().toLowerCase()));
  return questions.filter((q) =>
    q.themes.some((t) => targets.has(t.trim().toLowerCase()))
  );
}

/**
 * Filters questions by one or more difficulty levels (empty = all levels).
 */
export function filterQuestionsByDifficulties(
  questions: HydratedQuestion[],
  selectedDifficulties: DifficultyLevel[]
): HydratedQuestion[] {
  if (selectedDifficulties.length === 0) return questions;
  const allowed = new Set<DifficultyLevel>(selectedDifficulties);
  return questions.filter((q) => allowed.has(normalizeDifficultySafe(q.difficulte)));
}

export function countMatchingFilteredQuestions(
  rows: QuizRow[],
  matiere: string,
  sectionDs: string,
  selectedThemes: string[],
  selectedDifficulties: DifficultyLevel[] = []
): number {
  const pool = hydrateQuestions(
    rows.filter((r) => r.matiere === matiere && normalizeSectionDs(r.section_ds) === sectionDs)
  );
  const byThemes = filterQuestionsByThemes(pool, selectedThemes);
  return filterQuestionsByDifficulties(byThemes, selectedDifficulties).length;
}

export function countMatchingThemeQuestions(
  rows: QuizRow[],
  matiere: string,
  sectionDs: string,
  selectedThemes: string[]
): number {
  return countMatchingFilteredQuestions(rows, matiere, sectionDs, selectedThemes, []);
}

export interface DsConfigOptions {
  matiere: string;
  section_ds: string;
  mode: TrainingMode;
  themes: string[];
  difficulties: DifficultyLevel[];
  count: QuizCountOption;
}

/**
 * Computes the matching question pool and effective quiz size for the Level 3 DS Accordion.
 */
export function selectDsQuizQuestions(
  rows: QuizRow[],
  progress: ProgressMap,
  options: DsConfigOptions,
  rng: () => number = Math.random
): HydratedQuestion[] {
  const sectionPool = hydrateQuestions(
    rows.filter(
      (r) =>
        r.matiere === options.matiere &&
        normalizeSectionDs(r.section_ds) === normalizeSectionDs(options.section_ds)
    )
  );

  if (options.mode === 'exam') {
    return shuffleArray(sectionPool, rng).slice(0, Math.min(EXAM_QUESTION_LIMIT, sectionPool.length));
  }

  let filtered: HydratedQuestion[];
  if (options.mode === 'errors') {
    filtered = sectionPool.filter((q) => {
      const stat = progress[q.id];
      return stat && stat.tries > 0 && !stat.lastOk;
    });
  } else {
    const byThemes = filterQuestionsByThemes(sectionPool, options.themes);
    filtered = filterQuestionsByDifficulties(byThemes, options.difficulties);
  }

  const shuffled = shuffleArray(filtered, rng);
  if (options.count === 'max') return shuffled;
  return shuffled.slice(0, Math.min(options.count, shuffled.length));
}

export function computeDsSelectionStats(
  rows: QuizRow[],
  progress: ProgressMap,
  options: DsConfigOptions
): {
  totalInSection: number;
  missedInSection: number;
  availableForMode: number;
  effectiveCount: number;
} {
  const sectionPool = hydrateQuestions(
    rows.filter(
      (r) =>
        r.matiere === options.matiere &&
        normalizeSectionDs(r.section_ds) === normalizeSectionDs(options.section_ds)
    )
  );

  const missedPool = sectionPool.filter((q) => {
    const stat = progress[q.id];
    return stat && stat.tries > 0 && !stat.lastOk;
  });

  if (options.mode === 'exam') {
    const effective = Math.min(EXAM_QUESTION_LIMIT, sectionPool.length);
    return {
      totalInSection: sectionPool.length,
      missedInSection: missedPool.length,
      availableForMode: sectionPool.length,
      effectiveCount: effective,
    };
  }

  const availablePool =
    options.mode === 'errors'
      ? missedPool
      : filterQuestionsByDifficulties(
          filterQuestionsByThemes(sectionPool, options.themes),
          options.difficulties
        );

  const effective =
    options.count === 'max'
      ? availablePool.length
      : Math.min(options.count, availablePool.length);

  return {
    totalInSection: sectionPool.length,
    missedInSection: missedPool.length,
    availableForMode: availablePool.length,
    effectiveCount: effective,
  };
}

/**
 * Appends incoming questions into an existing DS question array without overwriting
 * existing entries, ensuring unique IDs across the merged array.
 */
export function mergeQuestionsIntoBatch(
  existing: QuizQuestion[],
  incoming: QuizQuestion[]
): QuizQuestion[] {
  const usedIds = new Set(existing.map((q) => q.id));
  const merged: QuizQuestion[] = existing.slice();

  for (let i = 0; i < incoming.length; i++) {
    const q = incoming[i];
    let candidateId = q.id || `m-${existing.length + i + 1}`;
    let suffix = 2;
    while (usedIds.has(candidateId)) {
      candidateId = `${q.id || 'q'}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(candidateId);
    merged.push({
      ...q,
      id: candidateId,
      themes: normalizeThemes(q.themes, q.concept),
      difficulte: normalizeDifficultySafe(q.difficulte),
    });
  }

  return merged;
}

/**
 * Combines registered subjects (from public.subjects, even if they have 0 quizzes yet)
 * with live quiz rows from public.quizzes, preserving display_order.
 */
export function buildSubjectSummaries(
  rows: QuizRow[],
  progress: ProgressMap,
  registeredSubjects: SubjectRecord[] = []
): SubjectSummary[] {
  const bySubject = new Map<string, HydratedQuestion[]>();
  const all = hydrateQuestions(rows);

  // Map lowercase subject name -> canonical SubjectRecord
  const registeredByKey = new Map<string, SubjectRecord>();
  for (const sub of registeredSubjects) {
    registeredByKey.set(sub.name.trim().toLowerCase(), sub);
  }

  for (const q of all) {
    const key = q.matiere.trim().toLowerCase();
    const canonicalName = registeredByKey.get(key)?.name ?? q.matiere.trim();
    const list = bySubject.get(canonicalName) ?? [];
    list.push({ ...q, matiere: canonicalName });
    bySubject.set(canonicalName, list);
  }

  // Ensure every registered subject appears even if it currently has 0 quizzes
  const orderedNames: string[] = [];
  const seenNames = new Set<string>();

  const sortedRegistered = registeredSubjects
    .slice()
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, 'fr'));

  for (const sub of sortedRegistered) {
    if (!seenNames.has(sub.name)) {
      seenNames.add(sub.name);
      orderedNames.push(sub.name);
    }
  }

  for (const name of bySubject.keys()) {
    if (!seenNames.has(name)) {
      seenNames.add(name);
      orderedNames.push(name);
    }
  }

  const summaries: SubjectSummary[] = orderedNames.map((matiere, idx) => {
    const reg = registeredByKey.get(matiere.toLowerCase());
    const questions = bySubject.get(matiere) ?? [];
    const sectionQuestionsMap = new Map<string, HydratedQuestion[]>();

    let seenCount = 0;
    let triesCount = 0;
    let rightCount = 0;
    let missedCount = 0;

    for (const q of questions) {
      const stat = progress[q.id];
      const seen = stat && stat.tries > 0 ? 1 : 0;
      const tries = stat ? stat.tries : 0;
      const right = stat ? stat.right : 0;
      const missed = stat && stat.tries > 0 && !stat.lastOk ? 1 : 0;

      seenCount += seen;
      triesCount += tries;
      rightCount += right;
      missedCount += missed;

      const secList = sectionQuestionsMap.get(q.section_ds) ?? [];
      secList.push(q);
      sectionQuestionsMap.set(q.section_ds, secList);
    }

    const sections: SectionSummary[] = Array.from(sectionQuestionsMap.entries())
      .map(([section_ds, secQuestions]) => {
        let secSeen = 0;
        let secTries = 0;
        let secRight = 0;
        let secMissed = 0;
        let secMastered = 0;
        const difficultyCounts: Record<DifficultyLevel, number> = { 1: 0, 2: 0, 3: 0 };

        for (const q of secQuestions) {
          difficultyCounts[q.difficulte] += 1;
          const stat = progress[q.id];
          if (stat && stat.tries > 0) {
            secSeen += 1;
            if (stat.lastOk) secMastered += 1;
            else secMissed += 1;
          }
          if (stat) {
            secTries += stat.tries;
            secRight += stat.right;
          }
        }

        const masteryRate =
          secQuestions.length > 0 ? Math.round((secMastered / secQuestions.length) * 100) : null;

        return {
          section_ds,
          totalQuestions: secQuestions.length,
          seenCount: secSeen,
          rightCount: secRight,
          triesCount: secTries,
          missedCount: secMissed,
          masteryRate,
          themes: extractSectionThemes(secQuestions, progress),
          difficultyCounts,
        };
      })
      .sort((a, b) => a.section_ds.localeCompare(b.section_ds, 'fr', { numeric: true }));

    return {
      id: reg?.id,
      slug: reg?.slug ?? slugifySubjectName(matiere),
      matiere,
      cover_image_url: reg?.cover_image_url ?? null,
      display_order: reg?.display_order ?? 100 + idx,
      totalQuestions: questions.length,
      sections,
      seenCount,
      triesCount,
      rightCount,
      missedCount,
      successRate: triesCount > 0 ? Math.round((rightCount / triesCount) * 100) : null,
    };
  });

  // When registered subjects are provided, honor display_order; otherwise keep question count desc
  if (registeredSubjects.length > 0) {
    return summaries.sort(
      (a, b) => a.display_order - b.display_order || a.matiere.localeCompare(b.matiere, 'fr')
    );
  }
  return summaries.sort(
    (a, b) => b.totalQuestions - a.totalQuestions || a.matiere.localeCompare(b.matiere, 'fr')
  );
}

export interface FilterCriteria {
  matiere: string;
  section_ds?: string; // 'all' or exact section_ds
  themes?: string[]; // empty or omitted = all themes in DS
  difficulties?: DifficultyLevel[]; // empty or omitted = all difficulty levels
  mode: QuizMode;
  examSize?: ExamSize;
}

export function selectQuizQuestions(
  rows: QuizRow[],
  criteria: FilterCriteria,
  rng: () => number = Math.random
): HydratedQuestion[] {
  let pool = hydrateQuestions(rows.filter((r) => r.matiere === criteria.matiere));

  if (criteria.section_ds && criteria.section_ds !== 'all') {
    pool = pool.filter((q) => q.section_ds === criteria.section_ds);
  }

  // Mode Examen DS: 20 or 30 random questions drawn from the entire DS
  if (criteria.mode === 'exam') {
    const limit = criteria.examSize ?? EXAM_QUESTION_LIMIT;
    return shuffleArray(pool, rng).slice(0, Math.min(limit, pool.length));
  }

  // Mode Entraînement / Standard: combinable filters on Grands Thèmes + Difficulté
  if (criteria.themes && criteria.themes.length > 0) {
    pool = filterQuestionsByThemes(pool, criteria.themes);
  }
  if (criteria.difficulties && criteria.difficulties.length > 0) {
    pool = filterQuestionsByDifficulties(pool, criteria.difficulties);
  }

  return shuffleArray(pool, rng);
}

export function getMissedQuestionsForSubject(
  rows: QuizRow[],
  matiere: string,
  progress: ProgressMap,
  sectionDs = 'all'
): HydratedQuestion[] {
  const subjectQuestions = hydrateQuestions(
    rows.filter(
      (r) =>
        r.matiere === matiere &&
        (sectionDs === 'all' || normalizeSectionDs(r.section_ds) === sectionDs)
    )
  );
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
  const themeStats = new Map<string, { theme: string; right: number; total: number }>();

  questions.forEach((q, idx) => {
    const isCorrect = evaluateAnswer(q, answers[idx]);
    if (isCorrect) {
      score += 1;
    } else {
      missedQuestions.push(q);
    }

    const qThemes = q.themes.length > 0 ? q.themes : ['Général'];
    for (const theme of qThemes) {
      const key = theme.toLowerCase();
      const entry = themeStats.get(key) ?? { theme, right: 0, total: 0 };
      entry.total += 1;
      if (isCorrect) entry.right += 1;
      themeStats.set(key, entry);
    }
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const points = computeQuizPoints(score, total);

  return {
    score,
    total,
    percentage,
    points,
    missedQuestions,
    byTheme: Array.from(themeStats.values()).sort(
      (a, b) => b.total - a.total || a.theme.localeCompare(b.theme, 'fr')
    ),
  };
}
