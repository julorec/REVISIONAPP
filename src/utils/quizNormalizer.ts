import type { CodeLanguage, DifficultyLevel, QuestionType, QuizQuestion } from '../types/quiz';
import { detectCodeLanguage } from './codeHighlight';

export const DEFAULT_DIFFICULTY: DifficultyLevel = 2;

export interface NormalizationResult {
  ok: boolean;
  questions: QuizQuestion[];
  errors: string[];
}

const LETTER_TO_INDEX: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
};

export function normalizeThemes(rawThemes: unknown, fallbackConcept?: string): string[] {
  const collected: string[] = [];

  if (Array.isArray(rawThemes)) {
    for (const item of rawThemes) {
      if (typeof item === 'string') {
        const cleaned = item.trim();
        if (cleaned) collected.push(cleaned);
      } else if (item !== null && item !== undefined) {
        const cleaned = String(item).trim();
        if (cleaned) collected.push(cleaned);
      }
    }
  } else if (typeof rawThemes === 'string' && rawThemes.trim()) {
    for (const part of rawThemes.split(/[,;|]/)) {
      const cleaned = part.trim();
      if (cleaned) collected.push(cleaned);
    }
  }

  if (collected.length === 0 && fallbackConcept && fallbackConcept.trim()) {
    collected.push(fallbackConcept.trim());
  }

  // Case-insensitive deduplication preserving first casing
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of collected) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tag);
    }
  }

  return unique.length > 0 ? unique : ['Général'];
}

export function normalizeDifficulty(raw: unknown): { value: DifficultyLevel; valid: boolean } {
  if (raw === undefined || raw === null || raw === '') {
    return { value: DEFAULT_DIFFICULTY, valid: true };
  }
  if (typeof raw === 'number') {
    if (raw === 1 || raw === 2 || raw === 3) {
      return { value: raw, valid: true };
    }
    return { value: DEFAULT_DIFFICULTY, valid: false };
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim();
    if (cleaned === '1') return { value: 1, valid: true };
    if (cleaned === '2') return { value: 2, valid: true };
    if (cleaned === '3') return { value: 3, valid: true };
    return { value: DEFAULT_DIFFICULTY, valid: false };
  }
  return { value: DEFAULT_DIFFICULTY, valid: false };
}

export function normalizeQuestionType(raw: unknown, rec: Record<string, unknown>): QuestionType {
  if (typeof raw === 'string') {
    const cleaned = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (
      cleaned === 'vrai_faux' ||
      cleaned === 'vf' ||
      cleaned === 'true_false' ||
      cleaned === 'boolean'
    ) {
      return 'vrai_faux';
    }
    if (
      cleaned === 'calcul' ||
      cleaned === 'numeric' ||
      cleaned === 'numerique' ||
      cleaned === 'numérique'
    ) {
      return 'calcul';
    }
    if (
      cleaned === 'ordre' ||
      cleaned === 'order' ||
      cleaned === 'sequence' ||
      cleaned === 'séquence'
    ) {
      return 'ordre';
    }
    if (cleaned === 'qcm' || cleaned === 'mcq' || cleaned === 'choice') {
      return 'qcm';
    }
  }
  // Auto-infer if type omitted
  if (Array.isArray(rec.ordre_correct ?? rec.correct_order)) {
    return 'ordre';
  }
  if (
    (rec.reponse_numerique !== undefined || rec.numeric_answer !== undefined) &&
    !Array.isArray(rec.opts ?? rec.options)
  ) {
    return 'calcul';
  }
  return 'qcm';
}

function parseFiniteNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolveAnswerIndex(rawAns: unknown, opts: string[], isVraiFaux = false): number | null {
  if (typeof rawAns === 'boolean') {
    if (isVraiFaux && opts.length >= 2) {
      const vraiIdx = opts.findIndex((o) => /^vrai|true$/i.test(o.trim()));
      const fauxIdx = opts.findIndex((o) => /^faux|false$/i.test(o.trim()));
      if (vraiIdx !== -1 && fauxIdx !== -1) return rawAns ? vraiIdx : fauxIdx;
      return rawAns ? 0 : 1;
    }
  }

  if (typeof rawAns === 'number' && Number.isInteger(rawAns)) {
    if (rawAns >= 0 && rawAns < opts.length) return rawAns;
    return null;
  }

  if (typeof rawAns === 'string') {
    const trimmed = rawAns.trim();
    if (/^\d+$/.test(trimmed)) {
      const idx = Number.parseInt(trimmed, 10);
      if (idx >= 0 && idx < opts.length) return idx;
    }
    const lower = trimmed.toLowerCase();
    if (isVraiFaux && opts.length >= 2) {
      const vraiIdx = opts.findIndex((o) => /^(vrai|true)$/i.test(o.trim()));
      const fauxIdx = opts.findIndex((o) => /^(faux|false)$/i.test(o.trim()));
      if ((lower === 'true' || lower === 'vrai') && vraiIdx !== -1) return vraiIdx;
      if ((lower === 'false' || lower === 'faux') && fauxIdx !== -1) return fauxIdx;
    }
    if (lower.length === 1 && lower in LETTER_TO_INDEX) {
      const idx = LETTER_TO_INDEX[lower];
      if (idx < opts.length) return idx;
    }
    // Exact or case-insensitive match with option text
    const exact = opts.findIndex((o) => o.trim() === trimmed);
    if (exact !== -1) return exact;
    const ci = opts.findIndex((o) => o.trim().toLowerCase() === lower);
    if (ci !== -1) return ci;
  }

  return null;
}

export function normalizeQuestionList(rawInput: unknown, idPrefix = 'q'): NormalizationResult {
  const errors: string[] = [];

  let arr: unknown = rawInput;
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { ok: false, questions: [], errors: ['Le champ JSON est vide.'] };
    }
    try {
      arr = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de syntaxe JSON';
      return { ok: false, questions: [], errors: [`JSON invalide : ${msg}`] };
    }
  }

  if (arr && typeof arr === 'object' && !Array.isArray(arr) && 'questions' in arr) {
    arr = (arr as { questions: unknown }).questions;
  }

  if (!Array.isArray(arr)) {
    return {
      ok: false,
      questions: [],
      errors: ['Le JSON doit être un tableau de questions (ex: [ { ... }, { ... } ]).'],
    };
  }

  if (arr.length === 0) {
    return {
      ok: false,
      questions: [],
      errors: ['Le tableau de questions est vide (au moins 1 question requise).'],
    };
  }

  const questions: QuizQuestion[] = [];

  arr.forEach((item, index) => {
    const label = `Question #${index + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label} : doit être un objet JSON.`);
      return;
    }

    const rec = item as Record<string, unknown>;
    const qType = normalizeQuestionType(rec.type, rec);

    const code =
      typeof rec.code === 'string' && rec.code.trim().length > 0 ? rec.code : undefined;

    const rawLang = rec.lang ?? rec.language ?? rec.langage;
    const lang: CodeLanguage | undefined = code
      ? detectCodeLanguage(code, typeof rawLang === 'string' ? rawLang : undefined)
      : undefined;

    const rawSvg = rec.svg ?? rec.schema ?? rec.schéma ?? rec.diagram;
    const svg =
      typeof rawSvg === 'string' && rawSvg.trim().length > 0 ? rawSvg.trim() : undefined;

    const rawAsk =
      rec.ask ?? rec.question ?? rec.enonce ?? rec.énoncé ?? rec.prompt ?? rec.intitule;
    const ask =
      typeof rawAsk === 'string' && rawAsk.trim().length > 0
        ? rawAsk.trim()
        : code
          ? "Qu'affiche ou réalise ce code ?"
          : '';

    if (!ask) {
      errors.push(`${label} : champ "ask" ou "question" manquant.`);
      return;
    }

    const rawWhy =
      rec.why ?? rec.explication ?? rec.explanation ?? rec.correction ?? rec.rationale;
    const why =
      typeof rawWhy === 'string' && rawWhy.trim().length > 0
        ? rawWhy.trim()
        : 'Aucune explication détaillée fournie pour cette question.';

    const concept =
      typeof rec.concept === 'string' && rec.concept.trim().length > 0
        ? rec.concept.trim()
        : typeof rec.tag === 'string' && rec.tag.trim().length > 0
          ? rec.tag.trim()
          : undefined;

    const themes = normalizeThemes(
      rec.themes ?? rec.thèmes ?? rec.tags ?? rec.theme ?? rec.thème,
      concept
    );

    const diffCheck = normalizeDifficulty(rec.difficulte ?? rec.difficulté ?? rec.difficulty);
    if (!diffCheck.valid) {
      errors.push(`${label} : champ "difficulte" invalide (entier attendu : 1, 2 ou 3).`);
      return;
    }
    const difficulte = diffCheck.value;

    const stdin =
      typeof rec.stdin === 'string' && rec.stdin.length > 0 ? rec.stdin : undefined;

    const id =
      rec.id !== undefined && rec.id !== null && String(rec.id).trim() !== ''
        ? `${idPrefix}-${String(rec.id).trim()}`
        : `${idPrefix}-${index + 1}`;

    // --- TYPE: ordre ---
    if (qType === 'ordre') {
      const rawOrder = rec.ordre_correct ?? rec.correct_order ?? rec.sequence ?? rec.etapes;
      if (!Array.isArray(rawOrder) || rawOrder.length < 2) {
        errors.push(`${label} (ordre) : champ "ordre_correct" doit contenir au moins 2 éléments.`);
        return;
      }
      const ordre_correct = rawOrder
        .map((step) => (typeof step === 'string' ? step.trim() : String(step).trim()))
        .filter((s) => s.length > 0);

      if (ordre_correct.length < 2) {
        errors.push(`${label} (ordre) : "ordre_correct" doit contenir au moins 2 éléments non vides.`);
        return;
      }

      questions.push({
        id,
        type: 'ordre',
        themes,
        difficulte,
        ask,
        concept,
        code,
        lang,
        stdin,
        svg,
        ordre_correct,
        why,
      });
      return;
    }

    // --- TYPE: calcul ---
    const rawOpts = rec.opts ?? rec.options ?? rec.choix ?? rec.reponses ?? rec.réponses;
    const hasOptions = Array.isArray(rawOpts) && rawOpts.length >= 2;

    if (qType === 'calcul' && !hasOptions) {
      const rawNum =
        rec.reponse_numerique ??
        rec.numeric_answer ??
        rec.valeur ??
        rec.ans ??
        rec.answer ??
        rec.reponse;
      const reponse_numerique = parseFiniteNumber(rawNum);
      if (reponse_numerique === null) {
        errors.push(
          `${label} (calcul) : champ "reponse_numerique" numérique attendu (ou fournir "options" pour basculer en QCM).`
        );
        return;
      }
      const rawUnite = rec.unite ?? rec.unité ?? rec.unit;
      const unite =
        typeof rawUnite === 'string' && rawUnite.trim().length > 0 ? rawUnite.trim() : undefined;

      const rawTol = parseFiniteNumber(rec.tolerance ?? rec.tolérance);
      const tolerance = rawTol !== null && rawTol >= 0 ? rawTol : 0.05;

      questions.push({
        id,
        type: 'calcul',
        themes,
        difficulte,
        ask,
        concept,
        code,
        lang,
        stdin,
        svg,
        reponse_numerique,
        unite,
        tolerance,
        why,
      });
      return;
    }

    // --- TYPE: qcm, vrai_faux, or calcul with options ---
    let opts: string[];
    if (hasOptions) {
      opts = (rawOpts as unknown[]).map((o) => (typeof o === 'string' ? o : String(o)));
    } else if (qType === 'vrai_faux') {
      opts = ['Vrai', 'Faux'];
    } else {
      errors.push(`${label} : champ "opts" ou "options" doit contenir au moins 2 choix.`);
      return;
    }

    const rawAns =
      rec.reponse_index ??
      rec.réponse_index ??
      rec.ans ??
      rec.answer ??
      rec.reponse ??
      rec.réponse ??
      rec.correct ??
      rec.correctIndex ??
      rec.index_reponse ??
      rec.reponse_numerique;

    const ans = resolveAnswerIndex(rawAns, opts, qType === 'vrai_faux');
    if (ans === null) {
      errors.push(
        `${label} : réponse correcte ("reponse_index", "reponse", "answer" ou "ans") invalide ou hors limites (attendu 0..${opts.length - 1}, "A".."${String.fromCharCode(64 + opts.length)}" ou texte exact d'un choix).`
      );
      return;
    }

    const rawUnite = rec.unite ?? rec.unité ?? rec.unit;
    const unite =
      typeof rawUnite === 'string' && rawUnite.trim().length > 0 ? rawUnite.trim() : undefined;

    questions.push({
      id,
      type: qType,
      themes,
      difficulte,
      ask,
      concept,
      code,
      lang,
      stdin,
      svg,
      opts,
      ans,
      unite,
      why,
    });
  });

  if (errors.length > 0) {
    return { ok: false, questions: [], errors };
  }

  return { ok: true, questions, errors: [] };
}
