-- ============================================================================
-- Coach Partiels — INSA Rennes ESET 3A
-- Source de vérité unique et 100 % idempotente du schéma Supabase
-- Exécutable à volonté via : psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
-- ou via GitHub Actions (.github/workflows/supabase-sync.yml)
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Fonction utilitaire pour la mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Table public.quizzes (Matières -> Sections DS -> Banque de questions JSONB)
--    Chaque question du tableau JSONB `questions` supporte :
--    { id, type, themes: ["Thème 1", "Thème 2"], ask, code, lang, svg,
--      opts, ans, reponse_numerique, unite, tolerance, ordre_correct, why }
-- ----------------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  matiere text not null,
  section_ds text not null default 'DS 1',
  chapitre text not null default 'Banque générale',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrations idempotentes des colonnes si la table existait dans une version antérieure
alter table public.quizzes add column if not exists matiere text;
alter table public.quizzes add column if not exists section_ds text not null default 'DS 1';
alter table public.quizzes add column if not exists chapitre text not null default 'Banque générale';
alter table public.quizzes alter column chapitre set default 'Banque générale';
alter table public.quizzes add column if not exists questions jsonb not null default '[]'::jsonb;
alter table public.quizzes add column if not exists created_at timestamptz not null default now();
alter table public.quizzes add column if not exists updated_at timestamptz not null default now();

-- Suppression idempotente de l'ancienne colonne type_source (Cours / Annales)
alter table public.quizzes drop constraint if exists quizzes_type_source_check;
alter table public.quizzes drop column if exists type_source;

-- Contraintes idempotentes sur public.quizzes
alter table public.quizzes drop constraint if exists quizzes_questions_is_array;
alter table public.quizzes
  add constraint quizzes_questions_is_array
  check (jsonb_typeof(questions) = 'array');

-- Trigger updated_at idempotent
drop trigger if exists trg_quizzes_set_updated_at on public.quizzes;
create trigger trg_quizzes_set_updated_at
  before update on public.quizzes
  for each row
  execute function public.set_updated_at();

-- Index de performance sur public.quizzes (banques de ~100 questions / DS)
create index if not exists idx_quizzes_matiere_section_ds
  on public.quizzes (matiere, section_ds);

create index if not exists idx_quizzes_questions_gin
  on public.quizzes using gin (questions);

-- ----------------------------------------------------------------------------
-- 3. Table public.scores (Classement par matière et section_ds)
-- ----------------------------------------------------------------------------
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

-- Migrations idempotentes des colonnes sur public.scores
alter table public.scores add column if not exists pseudo text;
alter table public.scores add column if not exists matiere text;
alter table public.scores add column if not exists section_ds text not null default 'DS 1';
alter table public.scores add column if not exists points integer not null default 0;
alter table public.scores add column if not exists bonnes_reponses integer not null default 0;
alter table public.scores add column if not exists total_questions integer not null default 0;
alter table public.scores add column if not exists created_at timestamptz not null default now();

-- Contraintes idempotentes sur public.scores
alter table public.scores drop constraint if exists scores_pseudo_non_empty;
alter table public.scores
  add constraint scores_pseudo_non_empty
  check (length(trim(pseudo)) > 0);

alter table public.scores drop constraint if exists scores_non_negative;
alter table public.scores
  add constraint scores_non_negative
  check (points >= 0 and bonnes_reponses >= 0 and total_questions >= 0 and bonnes_reponses <= total_questions);

-- Index de performance pour les classements par matière / section_ds
create index if not exists idx_scores_matiere_points
  on public.scores (matiere, points desc);

create index if not exists idx_scores_matiere_section_points
  on public.scores (matiere, section_ds, points desc);

create index if not exists idx_scores_pseudo_lower
  on public.scores (lower(trim(pseudo)));

-- ----------------------------------------------------------------------------
-- 4. Sécurité Row Level Security (RLS) & Droits API PostgREST
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.quizzes to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;

alter table public.quizzes enable row level security;
alter table public.scores enable row level security;

-- Politiques RLS : public.quizzes
drop policy if exists "Lecture publique des quizzes" on public.quizzes;
create policy "Lecture publique des quizzes"
  on public.quizzes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Insertion publique des quizzes" on public.quizzes;
create policy "Insertion publique des quizzes"
  on public.quizzes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Modification publique des quizzes" on public.quizzes;
create policy "Modification publique des quizzes"
  on public.quizzes
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Suppression publique des quizzes" on public.quizzes;
create policy "Suppression publique des quizzes"
  on public.quizzes
  for delete
  to anon, authenticated
  using (true);

-- Politiques RLS : public.scores
drop policy if exists "Lecture publique des scores" on public.scores;
create policy "Lecture publique des scores"
  on public.scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Insertion publique des scores" on public.scores;
create policy "Insertion publique des scores"
  on public.scores
  for insert
  to anon, authenticated
  with check (true);

-- ----------------------------------------------------------------------------
-- 5. Synchronisation temps réel (Supabase Realtime) idempotente
--    Permet à tous les étudiants connectés de recevoir automatiquement
--    les nouveaux quiz et scores dès leur publication.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quizzes'
    ) then
      alter publication supabase_realtime add table public.quizzes;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'scores'
    ) then
      alter publication supabase_realtime add table public.scores;
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Rafraîchissement immédiat du cache de schéma PostgREST
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
