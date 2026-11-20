import { createClient } from '@supabase/supabase-js';
import { SEED_QUIZZES } from '../data/seedQuizzes';
import { SEED_SCORES } from '../data/seedScores';
import type { ProgressMap, QuizQuestion, QuizRow, ScoreEntry } from '../types/quiz';
import { mergeQuestionsIntoBatch, normalizeSectionDs } from '../utils/quizEngine';
import { normalizeQuestionList } from '../utils/quizNormalizer';

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

const STORAGE_CACHE_KEY = 'coach_partiels_supabase_cache_v3';
const STORAGE_LOCAL_QUIZZES_KEY = 'coach_partiels_local_quizzes_v3';
const STORAGE_PROGRESS_KEY = 'coach_partiels_progress_v1';
const STORAGE_PSEUDO_KEY = 'coach_partiels_student_pseudo_v1';
const STORAGE_SCORES_CACHE_KEY = 'coach_partiels_scores_cache_v1';
const STORAGE_LOCAL_SCORES_KEY = 'coach_partiels_local_scores_v1';

export const CREATE_QUIZZES_TABLE_SQL = `-- Source de vérité unique : supabase/schema.sql (100 % idempotent)
create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  matiere text not null,
  section_ds text not null default 'DS 1',
  chapitre text not null default 'Banque générale',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quizzes drop constraint if exists quizzes_type_source_check;
alter table public.quizzes drop column if exists type_source;

alter table public.quizzes enable row level security;
drop policy if exists "Lecture publique des quizzes" on public.quizzes;
create policy "Lecture publique des quizzes" on public.quizzes for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des quizzes" on public.quizzes;
create policy "Insertion publique des quizzes" on public.quizzes for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique des quizzes" on public.quizzes;
create policy "Modification publique des quizzes" on public.quizzes for update to anon, authenticated using (true) with check (true);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null,
  matiere text not null,
  section_ds text not null default 'DS 1',
  points integer not null default 0,
  bonnes_reponses integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;
drop policy if exists "Lecture publique des scores" on public.scores;
create policy "Lecture publique des scores" on public.scores for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des scores" on public.scores;
create policy "Insertion publique des scores" on public.scores for insert to anon, authenticated with check (true);

notify pgrst, 'reload schema';`;

// ============================================================================
// STUDENT PSEUDO PERSISTENCE
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
// QUIZZES (SUPABASE + LOCAL FALLBACK + MERGE INTO EXISTING SECTION_DS)
// ============================================================================
export interface FetchQuizzesResult {
  rows: QuizRow[];
  source: 'supabase' | 'cache' | 'seed';
  supabaseError?: string;
}

interface RawSupabaseQuizRow {
  id: string | number;
  matiere?: string | null;
  section_ds?: string | null;
  chapitre?: string | null;
  questions?: unknown;
  created_at?: string;
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

export function loadLocalQuizzes(): QuizRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_QUIZZES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as QuizRow[]).map((r) => ({
      ...r,
      section_ds: normalizeSectionDs(r.section_ds),
      chapitre: r.chapitre || 'Banque générale',
    }));
  } catch {
    return [];
  }
}

function writeLocalQuizzes(rows: QuizRow[]): void {
  try {
    localStorage.setItem(STORAGE_LOCAL_QUIZZES_KEY, JSON.stringify(rows));
  } catch {
    // Ignore quota errors
  }
}

export function saveLocalQuiz(payload: {
  id?: string;
  matiere: string;
  section_ds: string;
  chapitre?: string;
  questions: QuizQuestion[];
}): QuizRow {
  const existing = loadLocalQuizzes();
  const section_ds = normalizeSectionDs(payload.section_ds);
  const chapitre = (payload.chapitre || section_ds).trim();

  if (payload.id) {
    const idx = existing.findIndex((r) => r.id === payload.id);
    if (idx !== -1) {
      const updated: QuizRow = {
        ...existing[idx],
        matiere: payload.matiere.trim(),
        section_ds,
        chapitre,
        questions: payload.questions,
      };
      const next = existing.slice();
      next[idx] = updated;
      writeLocalQuizzes(next);
      return updated;
    }
  }

  const row: QuizRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    matiere: payload.matiere.trim(),
    section_ds,
    chapitre,
    questions: payload.questions,
    origin: 'local',
    created_at: new Date().toISOString(),
  };
  writeLocalQuizzes([row, ...existing]);
  return row;
}

/**
 * Merges incoming questions into a local row matching (matiere, section_ds) without
 * overwriting any existing local or seed questions.
 */
export function mergeLocalQuizSection(payload: {
  matiere: string;
  section_ds: string;
  questions: QuizQuestion[];
}): { row: QuizRow; mergedCount: number } {
  const existing = loadLocalQuizzes();
  const matiere = payload.matiere.trim();
  const section_ds = normalizeSectionDs(payload.section_ds);

  const idx = existing.findIndex(
    (r) => r.matiere === matiere && normalizeSectionDs(r.section_ds) === section_ds
  );

  if (idx !== -1) {
    const target = existing[idx];
    const mergedQuestions = mergeQuestionsIntoBatch(target.questions, payload.questions);
    const updated: QuizRow = {
      ...target,
      questions: mergedQuestions,
    };
    const next = existing.slice();
    next[idx] = updated;
    writeLocalQuizzes(next);
    return { row: updated, mergedCount: mergedQuestions.length };
  }

  const created = saveLocalQuiz({
    matiere,
    section_ds,
    chapitre: `Ajout ${section_ds}`,
    questions: payload.questions,
  });
  return { row: created, mergedCount: created.questions.length };
}

export function deleteLocalQuiz(id: string): void {
  const existing = loadLocalQuizzes().filter((r) => r.id !== id);
  writeLocalQuizzes(existing);
}

function loadCachedSupabaseQuizzes(): QuizRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as QuizRow[]).map((r) => ({
          ...r,
          section_ds: normalizeSectionDs(r.section_ds),
          chapitre: r.chapitre || 'Banque générale',
        }))
      : [];
  } catch {
    return [];
  }
}

function saveCachedSupabaseQuizzes(rows: QuizRow[]): void {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore quota errors
  }
}

export async function fetchQuizzes(): Promise<FetchQuizzesResult> {
  const localQuizzes = loadLocalQuizzes();

  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, matiere, section_ds, chapitre, questions, created_at');

    if (error) {
      const cached = loadCachedSupabaseQuizzes();
      if (cached.length > 0) {
        return {
          rows: [...localQuizzes, ...cached],
          source: 'cache',
          supabaseError: `${error.code ?? 'SUPABASE'} : ${error.message}`,
        };
      }
      return {
        rows: [...localQuizzes, ...SEED_QUIZZES],
        source: 'seed',
        supabaseError: `${error.code ?? 'SUPABASE'} : ${error.message}`,
      };
    }

    const hydrated = ((data as RawSupabaseQuizRow[] | null) ?? [])
      .map(hydrateSupabaseRow)
      .filter((r): r is QuizRow => r !== null);

    if (hydrated.length > 0) {
      saveCachedSupabaseQuizzes(hydrated);
      return {
        rows: [...localQuizzes, ...hydrated],
        source: 'supabase',
      };
    }

    return {
      rows: [...localQuizzes, ...SEED_QUIZZES],
      source: 'seed',
    };
  } catch (err) {
    const cached = loadCachedSupabaseQuizzes();
    const message = err instanceof Error ? err.message : 'Erreur réseau Supabase';
    if (cached.length > 0) {
      return {
        rows: [...localQuizzes, ...cached],
        source: 'cache',
        supabaseError: message,
      };
    }
    return {
      rows: [...localQuizzes, ...SEED_QUIZZES],
      source: 'seed',
      supabaseError: message,
    };
  }
}

export interface UpsertQuizResult {
  ok: boolean;
  row?: QuizRow;
  totalQuestionsAfterMerge?: number;
  error?: string;
  isMissingTable?: boolean;
}

function isSupabaseMissingTable(error: { code?: string; message: string }): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table/i.test(error.message)
  );
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
        isMissingTable: isSupabaseMissingTable(error),
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
 * row in Supabase without overwriting any already-present questions.
 * Creates the section row if none exists yet in Supabase.
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
        isMissingTable: isSupabaseMissingTable(fetchError),
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
        isMissingTable: isSupabaseMissingTable(updateError),
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
        isMissingTable: isSupabaseMissingTable(error),
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

// ============================================================================
// SCORES / LEADERBOARD (SUPABASE `scores` + LOCAL FALLBACK)
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

export function loadLocalScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLocalScore(entry: Omit<ScoreEntry, 'id' | 'origin'>): ScoreEntry {
  const existing = loadLocalScores();
  const created: ScoreEntry = {
    ...entry,
    id: `local-sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: entry.created_at ?? new Date().toISOString(),
    origin: 'local',
  };
  try {
    localStorage.setItem(STORAGE_LOCAL_SCORES_KEY, JSON.stringify([created, ...existing]));
  } catch {
    // Ignore
  }
  return created;
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

export interface FetchScoresResult {
  scores: ScoreEntry[];
  source: 'supabase' | 'cache' | 'seed';
}

export async function fetchScores(matiere?: string): Promise<FetchScoresResult> {
  const localScores = loadLocalScores();

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
      const cached = loadCachedScores();
      if (cached.length > 0) {
        return { scores: [...localScores, ...cached], source: 'cache' };
      }
      return { scores: [...localScores, ...SEED_SCORES], source: 'seed' };
    }

    const hydrated = ((data as RawSupabaseScoreRow[] | null) ?? [])
      .map(hydrateScoreRow)
      .filter((s): s is ScoreEntry => s !== null);

    if (hydrated.length > 0) {
      if (!matiere) saveCachedScores(hydrated);
      return { scores: [...localScores, ...hydrated], source: 'supabase' };
    }

    return { scores: [...localScores, ...SEED_SCORES], source: 'seed' };
  } catch {
    const cached = loadCachedScores();
    if (cached.length > 0) {
      return { scores: [...localScores, ...cached], source: 'cache' };
    }
    return { scores: [...localScores, ...SEED_SCORES], source: 'seed' };
  }
}

export interface InsertScoreResult {
  entry: ScoreEntry;
  persistedTo: 'supabase' | 'local';
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
    // Fall through to local persistence when offline or table not yet created
  }

  const localEntry = saveLocalScore(cleanPayload);
  return { entry: localEntry, persistedTo: 'local' };
}

// ============================================================================
// PROGRESS PERSISTENCE
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
