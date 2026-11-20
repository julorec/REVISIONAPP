import { createClient } from '@supabase/supabase-js';
import { SEED_QUIZZES } from '../data/seedQuizzes';
import type { ProgressMap, QuizQuestion, QuizRow, SourceType } from '../types/quiz';
import { normalizeQuestionList, normalizeSourceType } from '../utils/quizNormalizer';

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

const STORAGE_CACHE_KEY = 'coach_partiels_supabase_cache_v1';
const STORAGE_LOCAL_QUIZZES_KEY = 'coach_partiels_local_quizzes_v1';
const STORAGE_PROGRESS_KEY = 'coach_partiels_progress_v1';

export const CREATE_QUIZZES_TABLE_SQL = `create table if not exists public.quizzes (
  id uuid default gen_random_uuid() primary key,
  matiere text not null,
  chapitre text not null,
  type_source text not null default 'Cours',
  questions jsonb not null,
  created_at timestamptz default now()
);

alter table public.quizzes enable row level security;

create policy "Lecture publique des quizzes"
  on public.quizzes for select using (true);

create policy "Insertion publique des quizzes"
  on public.quizzes for insert with check (true);`;

export interface FetchQuizzesResult {
  rows: QuizRow[];
  source: 'supabase' | 'cache' | 'seed';
  supabaseError?: string;
}

interface RawSupabaseQuizRow {
  id: string | number;
  matiere?: string | null;
  chapitre?: string | null;
  type_source?: string | null;
  questions?: unknown;
  created_at?: string;
}

function hydrateSupabaseRow(raw: RawSupabaseQuizRow): QuizRow | null {
  const id = String(raw.id);
  const matiere = (raw.matiere || 'Matière générale').trim();
  const chapitre = (raw.chapitre || 'Chapitre général').trim();
  const type_source = normalizeSourceType(raw.type_source);

  const normalized = normalizeQuestionList(raw.questions, id);
  if (!normalized.ok || normalized.questions.length === 0) {
    return null;
  }

  return {
    id,
    matiere,
    chapitre,
    type_source,
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
    return Array.isArray(parsed) ? (parsed as QuizRow[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalQuiz(payload: {
  matiere: string;
  chapitre: string;
  type_source: SourceType;
  questions: QuizQuestion[];
}): QuizRow {
  const existing = loadLocalQuizzes();
  const row: QuizRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    matiere: payload.matiere.trim(),
    chapitre: payload.chapitre.trim(),
    type_source: payload.type_source,
    questions: payload.questions,
    origin: 'local',
    created_at: new Date().toISOString(),
  };
  const next = [row, ...existing];
  try {
    localStorage.setItem(STORAGE_LOCAL_QUIZZES_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  return row;
}

export function deleteLocalQuiz(id: string): void {
  const existing = loadLocalQuizzes().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_LOCAL_QUIZZES_KEY, JSON.stringify(existing));
  } catch {
    // Ignore quota errors
  }
}

function loadCachedSupabaseQuizzes(): QuizRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizRow[]) : [];
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
      .select('id, matiere, chapitre, type_source, questions');

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

    const hydrated = (data as RawSupabaseQuizRow[] | null ?? [])
      .map(hydrateSupabaseRow)
      .filter((r): r is QuizRow => r !== null);

    if (hydrated.length > 0) {
      saveCachedSupabaseQuizzes(hydrated);
      return {
        rows: [...localQuizzes, ...hydrated],
        source: 'supabase',
      };
    }

    // Table exists in Supabase but is currently empty -> keep seed bank visible alongside any local batches
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

export interface InsertQuizResult {
  ok: boolean;
  row?: QuizRow;
  error?: string;
  isMissingTable?: boolean;
}

export async function insertQuizToSupabase(payload: {
  matiere: string;
  chapitre: string;
  type_source: SourceType;
  questions: QuizQuestion[];
}): Promise<InsertQuizResult> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        matiere: payload.matiere.trim(),
        chapitre: payload.chapitre.trim(),
        type_source: payload.type_source,
        questions: payload.questions,
      })
      .select('id, matiere, chapitre, type_source, questions')
      .single();

    if (error) {
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        /could not find the table/i.test(error.message);
      return {
        ok: false,
        error: `${error.code ?? 'Erreur Supabase'} : ${error.message}`,
        isMissingTable,
      };
    }

    const hydrated = hydrateSupabaseRow(data as RawSupabaseQuizRow);
    return {
      ok: true,
      row: hydrated ?? {
        id: String((data as { id?: string })?.id ?? Date.now()),
        matiere: payload.matiere.trim(),
        chapitre: payload.chapitre.trim(),
        type_source: payload.type_source,
        questions: payload.questions,
        origin: 'supabase',
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Impossible de joindre Supabase.',
    };
  }
}

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
