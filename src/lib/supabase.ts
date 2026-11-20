import { createClient } from '@supabase/supabase-js';
import type { ProgressMap, QuizQuestion, QuizRow, ScoreEntry } from '../types/quiz';
import { mergeQuestionsIntoBatch, normalizeSectionDs } from '../utils/quizEngine';
import { normalizeQuestionList } from '../utils/quizNormalizer';
import {
  mergeRemoteAndPendingScores,
  removeSyncedPendingScores,
  type PendingScorePayload,
} from '../utils/syncState';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qnjiqjuqdhxemkcffgjp.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_eZqDwNSeE4HuQTOFR1Twxw_4fabN-Vq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Client storage keys (scores offline outbox, personal progress & pseudo only — quizzes are 100% live from Supabase)
const STORAGE_SCORES_CACHE_KEY = 'coach_partiels_scores_cache_v2';
const STORAGE_PENDING_SCORES_KEY = 'coach_partiels_pending_scores_v1';
const STORAGE_PROGRESS_KEY = 'coach_partiels_progress_v1';
const STORAGE_PSEUDO_KEY = 'coach_partiels_student_pseudo_v1';

// ============================================================================
// STUDENT PSEUDO PERSISTENCE (personal preference on device)
// ============================================================================
export function loadStudentPseudo(): string {
  try {
    return (localStorage.getItem(STORAGE_PSEUDO_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveStudentPseudo(pseudo: string): string {
  const cleaned = pseudo.trim().slice(0, 32);
  try {
    localStorage.setItem(STORAGE_PSEUDO_KEY, cleaned);
  } catch {
    // Ignore storage issues
  }
  return cleaned;
}

// ============================================================================
// QUIZZES — 100% LIVE FROM SUPABASE (NO LOCAL OR DEFAULT DATA)
// ============================================================================
export interface FetchQuizzesResult {
  rows: QuizRow[];
  source: 'supabase' | 'error';
  error?: string;
}

interface RawSupabaseQuizRow {
  id: string | number;
  matiere?: string | null;
  section_ds?: string | null;
  chapitre?: string | null;
  questions?: unknown;
  created_at?: string;
  updated_at?: string;
}

function hydrateSupabaseRow(raw: RawSupabaseQuizRow): QuizRow | null {
  const id = String(raw.id);
  const matiere = (raw.matiere || 'Matière générale').trim();
  const section_ds = normalizeSectionDs(raw.section_ds);
  const chapitre = (raw.chapitre || 'Banque générale').trim();

  const normalized = normalizeQuestionList(raw.questions, id);
  if (!normalized.ok || normalized.questions.length === 0) {
    return null;
  }

  return {
    id,
    matiere,
    section_ds,
    chapitre,
    questions: normalized.questions,
    origin: 'supabase',
    created_at: raw.created_at,
  };
}

/**
 * Fetches the authoritative quiz catalog directly from Supabase.
 * Never returns local, cached, or default quizzes.
 */
export async function fetchQuizzes(): Promise<FetchQuizzesResult> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, matiere, section_ds, chapitre, questions, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      return {
        rows: [],
        source: 'error',
        error: `${error.code ?? 'SUPABASE'} : ${error.message}`,
      };
    }

    const hydrated = ((data as RawSupabaseQuizRow[] | null) ?? [])
      .map(hydrateSupabaseRow)
      .filter((r): r is QuizRow => r !== null);

    return {
      rows: hydrated,
      source: 'supabase',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau Supabase';
    return {
      rows: [],
      source: 'error',
      error: message,
    };
  }
}

export interface UpsertQuizResult {
  ok: boolean;
  row?: QuizRow;
  totalQuestionsAfterMerge?: number;
  error?: string;
}

export async function insertQuizToSupabase(payload: {
  matiere: string;
  section_ds: string;
  chapitre?: string;
  questions: QuizQuestion[];
}): Promise<UpsertQuizResult> {
  const matiere = payload.matiere.trim();
  const section_ds = normalizeSectionDs(payload.section_ds);
  const chapitre = (payload.chapitre || section_ds).trim();

  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        matiere,
        section_ds,
        chapitre,
        questions: payload.questions,
      })
      .select('id, matiere, section_ds, chapitre, questions, created_at')
      .single();

    if (error) {
      return {
        ok: false,
        error: `${error.code ?? 'Erreur Supabase'} : ${error.message}`,
      };
    }

    const hydrated = hydrateSupabaseRow(data as RawSupabaseQuizRow);
    return {
      ok: true,
      row: hydrated ?? {
        id: String((data as { id?: string })?.id ?? Date.now()),
        matiere,
        section_ds,
        chapitre,
        questions: payload.questions,
        origin: 'supabase',
      },
      totalQuestionsAfterMerge: payload.questions.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Impossible de joindre Supabase.',
    };
  }
}

/**
 * Merges a new batch of questions directly into an existing (matiere, section_ds)
 * row in Supabase without overwriting already-present questions.
 */
export async function appendQuestionsToSectionDsInSupabase(payload: {
  matiere: string;
  section_ds: string;
  questions: QuizQuestion[];
}): Promise<UpsertQuizResult> {
  const matiere = payload.matiere.trim();
  const section_ds = normalizeSectionDs(payload.section_ds);

  try {
    const { data: existingRows, error: fetchError } = await supabase
      .from('quizzes')
      .select('id, matiere, section_ds, chapitre, questions, created_at')
      .eq('matiere', matiere)
      .eq('section_ds', section_ds)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      return {
        ok: false,
        error: `${fetchError.code ?? 'Erreur Supabase'} : ${fetchError.message}`,
      };
    }

    const targetRaw = (existingRows as RawSupabaseQuizRow[] | null)?.[0];
    if (!targetRaw) {
      return insertQuizToSupabase({
        matiere,
        section_ds,
        chapitre: section_ds,
        questions: payload.questions,
      });
    }

    const hydratedTarget = hydrateSupabaseRow(targetRaw);
    const existingQuestions = hydratedTarget ? hydratedTarget.questions : [];
    const mergedQuestions = mergeQuestionsIntoBatch(existingQuestions, payload.questions);

    const { data: updated, error: updateError } = await supabase
      .from('quizzes')
      .update({ questions: mergedQuestions })
      .eq('id', String(targetRaw.id))
      .select('id, matiere, section_ds, chapitre, questions, created_at')
      .single();

    if (updateError) {
      return {
        ok: false,
        error: `${updateError.code ?? 'Erreur Supabase'} : ${updateError.message}`,
      };
    }

    const hydrated = hydrateSupabaseRow(updated as RawSupabaseQuizRow);
    return {
      ok: true,
      row: hydrated ?? undefined,
      totalQuestionsAfterMerge: mergedQuestions.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Impossible de joindre Supabase.',
    };
  }
}

export async function updateQuizInSupabase(
  id: string,
  payload: {
    matiere: string;
    section_ds: string;
    chapitre?: string;
    questions: QuizQuestion[];
  }
): Promise<UpsertQuizResult> {
  const matiere = payload.matiere.trim();
  const section_ds = normalizeSectionDs(payload.section_ds);
  const chapitre = (payload.chapitre || section_ds).trim();

  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update({
        matiere,
        section_ds,
        chapitre,
        questions: payload.questions,
      })
      .eq('id', id)
      .select('id, matiere, section_ds, chapitre, questions, created_at')
      .single();

    if (error) {
      return {
        ok: false,
        error: `${error.code ?? 'Erreur Supabase'} : ${error.message}`,
      };
    }

    const hydrated = hydrateSupabaseRow(data as RawSupabaseQuizRow);
    return { ok: true, row: hydrated ?? undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Impossible de joindre Supabase.',
    };
  }
}

export async function deleteQuizInSupabase(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      return { ok: false, error: `${error.code ?? 'Erreur Supabase'} : ${error.message}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Impossible de joindre Supabase.',
    };
  }
}

// ============================================================================
// SCORES / LEADERBOARD — SUPABASE SINGLE SOURCE OF TRUTH (+ OFFLINE OUTBOX)
// ============================================================================
interface RawSupabaseScoreRow {
  id: string | number;
  pseudo?: string | null;
  matiere?: string | null;
  section_ds?: string | null;
  points?: number | null;
  bonnes_reponses?: number | null;
  total_questions?: number | null;
  created_at?: string;
}

function hydrateScoreRow(raw: RawSupabaseScoreRow): ScoreEntry | null {
  const pseudo = (raw.pseudo || '').trim();
  const matiere = (raw.matiere || '').trim();
  if (!pseudo || !matiere) return null;
  return {
    id: String(raw.id),
    pseudo,
    matiere,
    section_ds: normalizeSectionDs(raw.section_ds),
    points: Number(raw.points) || 0,
    bonnes_reponses: Number(raw.bonnes_reponses) || 0,
    total_questions: Number(raw.total_questions) || 0,
    created_at: raw.created_at,
    origin: 'supabase',
  };
}

function loadPendingScores(): PendingScorePayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingScorePayload[]) : [];
  } catch {
    return [];
  }
}

function writePendingScores(items: PendingScorePayload[]): void {
  try {
    localStorage.setItem(STORAGE_PENDING_SCORES_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage issues
  }
}

function loadCachedScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCORES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function saveCachedScores(rows: ScoreEntry[]): void {
  try {
    localStorage.setItem(STORAGE_SCORES_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore
  }
}

/**
 * Flushes any scores recorded while offline up to Supabase as soon as connection returns.
 */
export async function flushPendingScores(): Promise<number> {
  const pending = loadPendingScores();
  if (pending.length === 0) return 0;

  const syncedIds = new Set<string>();
  for (const item of pending) {
    try {
      const { error } = await supabase.from('scores').insert({
        pseudo: item.pseudo,
        matiere: item.matiere,
        section_ds: item.section_ds,
        points: item.points,
        bonnes_reponses: item.bonnes_reponses,
        total_questions: item.total_questions,
      });
      if (!error) {
        syncedIds.add(item.clientId);
      }
    } catch {
      break;
    }
  }

  if (syncedIds.size > 0) {
    writePendingScores(removeSyncedPendingScores(pending, syncedIds));
  }
  return syncedIds.size;
}

export interface FetchScoresResult {
  scores: ScoreEntry[];
  source: 'supabase' | 'offline-cache';
}

export async function fetchScores(matiere?: string): Promise<FetchScoresResult> {
  await flushPendingScores();
  const pending = loadPendingScores();

  try {
    let query = supabase
      .from('scores')
      .select('id, pseudo, matiere, section_ds, points, bonnes_reponses, total_questions, created_at')
      .order('points', { ascending: false });

    if (matiere) {
      query = query.eq('matiere', matiere);
    }

    const { data, error } = await query;

    if (error) {
      return {
        scores: mergeRemoteAndPendingScores(loadCachedScores(), pending),
        source: 'offline-cache',
      };
    }

    const hydrated = ((data as RawSupabaseScoreRow[] | null) ?? [])
      .map(hydrateScoreRow)
      .filter((s): s is ScoreEntry => s !== null);

    if (!matiere) {
      saveCachedScores(hydrated);
    }

    return {
      scores: mergeRemoteAndPendingScores(hydrated, pending),
      source: 'supabase',
    };
  } catch {
    return {
      scores: mergeRemoteAndPendingScores(loadCachedScores(), pending),
      source: 'offline-cache',
    };
  }
}

export interface InsertScoreResult {
  entry: ScoreEntry;
  persistedTo: 'supabase' | 'pending';
}

export async function recordQuizScore(payload: {
  pseudo: string;
  matiere: string;
  section_ds: string;
  points: number;
  bonnes_reponses: number;
  total_questions: number;
}): Promise<InsertScoreResult> {
  const cleanPayload = {
    pseudo: payload.pseudo.trim() || 'Étudiant ESET',
    matiere: payload.matiere.trim(),
    section_ds: normalizeSectionDs(payload.section_ds),
    points: Math.max(0, Math.round(payload.points)),
    bonnes_reponses: Math.max(0, Math.round(payload.bonnes_reponses)),
    total_questions: Math.max(0, Math.round(payload.total_questions)),
  };

  try {
    const { data, error } = await supabase
      .from('scores')
      .insert(cleanPayload)
      .select('id, pseudo, matiere, section_ds, points, bonnes_reponses, total_questions, created_at')
      .single();

    if (!error && data) {
      const hydrated = hydrateScoreRow(data as RawSupabaseScoreRow);
      if (hydrated) {
        return { entry: hydrated, persistedTo: 'supabase' };
      }
    }
  } catch {
    // Queue in offline outbox below
  }

  const queued: PendingScorePayload = {
    ...cleanPayload,
    clientId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  writePendingScores([queued, ...loadPendingScores()]);

  return {
    entry: {
      id: queued.clientId,
      ...cleanPayload,
      created_at: queued.created_at,
      origin: 'local',
    },
    persistedTo: 'pending',
  };
}

// ============================================================================
// REALTIME SUBSCRIPTION (AUTO-SYNC NEW QUIZZES & SCORES FOR ALL USERS)
// ============================================================================
export function subscribeToSupabaseChanges(handlers: {
  onQuizzesChanged: () => void;
  onScoresChanged: () => void;
}): () => void {
  const channel = supabase
    .channel('coach-partiels-live-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quizzes' },
      () => {
        handlers.onQuizzesChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scores' },
      () => {
        handlers.onScoresChanged();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ============================================================================
// PERSONAL PROGRESS PERSISTENCE (per-student local mastery tracking)
// ============================================================================
export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
}
