-- ============================================================================
-- Coach Partiels — INSA Rennes ESET 3A
-- Source de vérité unique et 100 % idempotente du schéma Supabase
-- Exécutable à volonté via GitHub Actions (.github/workflows/supabase-sync.yml)
-- ou via psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
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
-- 2. Table public.subjects (Matières pré-enregistrées + couverture)
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  cover_image_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.subjects add column if not exists name text;
alter table public.subjects add column if not exists slug text;
alter table public.subjects add column if not exists cover_image_url text;
alter table public.subjects add column if not exists display_order integer not null default 0;
alter table public.subjects add column if not exists created_at timestamptz not null default now();

create index if not exists idx_subjects_display_order
  on public.subjects (display_order asc, name asc);

-- Pré-remplissage idempotent des matières ESET 3A
insert into public.subjects (name, slug, display_order)
values
  ('Langage C', 'langage-c', 1),
  ('Maths', 'maths', 2),
  ('ELEN numérique', 'elen-numerique', 3),
  ('Prog Systèmes', 'prog-systemes', 4),
  ('TTSD', 'ttsd', 5),
  ('Électronique analogique', 'electronique-analogique', 6),
  ('Architecture des processeurs', 'architecture-des-processeurs', 7),
  ('Anglais', 'anglais', 8)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 3. Table public.app_settings (Paramètres globaux : bannière d'accueil, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings add column if not exists value text;
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_app_settings_set_updated_at on public.app_settings;
create trigger trg_app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

insert into public.app_settings (key, value)
values ('home_banner_url', null)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Table public.quizzes (Banques de questions JSONB Admin)
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

alter table public.quizzes add column if not exists matiere text;
alter table public.quizzes add column if not exists section_ds text not null default 'DS 1';
alter table public.quizzes add column if not exists chapitre text not null default 'Banque générale';
alter table public.quizzes alter column chapitre set default 'Banque générale';
alter table public.quizzes add column if not exists questions jsonb not null default '[]'::jsonb;
alter table public.quizzes add column if not exists created_at timestamptz not null default now();
alter table public.quizzes add column if not exists updated_at timestamptz not null default now();

alter table public.quizzes drop constraint if exists quizzes_type_source_check;
alter table public.quizzes drop column if exists type_source;

alter table public.quizzes drop constraint if exists quizzes_questions_is_array;
alter table public.quizzes
  add constraint quizzes_questions_is_array
  check (jsonb_typeof(questions) = 'array');

drop trigger if exists trg_quizzes_set_updated_at on public.quizzes;
create trigger trg_quizzes_set_updated_at
  before update on public.quizzes
  for each row
  execute function public.set_updated_at();

create index if not exists idx_quizzes_matiere_section_ds
  on public.quizzes (matiere, section_ds);

create index if not exists idx_quizzes_questions_gin
  on public.quizzes using gin (questions);

update public.quizzes
set questions = (
  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(elem) = 'object' and not (elem ? 'difficulte')
          then elem || '{"difficulte": 2}'::jsonb
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(questions) as elem
)
where jsonb_typeof(questions) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(questions) as elem
    where jsonb_typeof(elem) = 'object' and not (elem ? 'difficulte')
  );

-- ----------------------------------------------------------------------------
-- 5. Table public.scores (Rétrocompatibilité scores Admin)
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

alter table public.scores add column if not exists pseudo text;
alter table public.scores add column if not exists matiere text;
alter table public.scores add column if not exists section_ds text not null default 'DS 1';
alter table public.scores add column if not exists points integer not null default 0;
alter table public.scores add column if not exists bonnes_reponses integer not null default 0;
alter table public.scores add column if not exists total_questions integer not null default 0;
alter table public.scores add column if not exists created_at timestamptz not null default now();

alter table public.scores drop constraint if exists scores_pseudo_non_empty;
alter table public.scores
  add constraint scores_pseudo_non_empty
  check (length(trim(pseudo)) > 0);

alter table public.scores drop constraint if exists scores_non_negative;
alter table public.scores
  add constraint scores_non_negative
  check (points >= 0 and bonnes_reponses >= 0 and total_questions >= 0 and bonnes_reponses <= total_questions);

create index if not exists idx_scores_matiere_points
  on public.scores (matiere, points desc);

create index if not exists idx_scores_matiere_section_points
  on public.scores (matiere, section_ds, points desc);

create index if not exists idx_scores_pseudo_lower
  on public.scores (lower(trim(pseudo)));

-- ----------------------------------------------------------------------------
-- 6. Tables Coach Partiels (synchro profil, classement promo, discussion live)
--    Remplacent window.claude.use("db") / user de l'artefact Claude.
-- ----------------------------------------------------------------------------
create table if not exists public.coach_profiles (
  uid text primary key,
  profile_name text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.coach_profiles add column if not exists profile_name text not null default '';
alter table public.coach_profiles add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.coach_profiles add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_coach_profiles_set_updated_at on public.coach_profiles;
create trigger trg_coach_profiles_set_updated_at
  before update on public.coach_profiles
  for each row
  execute function public.set_updated_at();

create table if not exists public.coach_board (
  id text primary key,
  board text not null,
  uid text not null,
  n text not null,
  best numeric not null default 0,
  avg numeric not null default 0,
  sims integer not null default 0,
  weak text not null default '',
  wr integer not null default 0,
  ts bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.coach_board add column if not exists board text;
alter table public.coach_board add column if not exists uid text;
alter table public.coach_board add column if not exists n text;
alter table public.coach_board add column if not exists best numeric not null default 0;
alter table public.coach_board add column if not exists avg numeric not null default 0;
alter table public.coach_board add column if not exists sims integer not null default 0;
alter table public.coach_board add column if not exists weak text not null default '';
alter table public.coach_board add column if not exists wr integer not null default 0;
alter table public.coach_board add column if not exists ts bigint not null default 0;
alter table public.coach_board add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_coach_board_board_best
  on public.coach_board (board, best desc, avg desc);

drop trigger if exists trg_coach_board_set_updated_at on public.coach_board;
create trigger trg_coach_board_set_updated_at
  before update on public.coach_board
  for each row
  execute function public.set_updated_at();

create table if not exists public.coach_chat (
  id text primary key,
  channel text not null default 'chat',
  u text not null,
  n text not null,
  t text not null,
  ts bigint not null,
  created_at timestamptz not null default now()
);

alter table public.coach_chat add column if not exists channel text not null default 'chat';
alter table public.coach_chat add column if not exists u text;
alter table public.coach_chat add column if not exists n text;
alter table public.coach_chat add column if not exists t text;
alter table public.coach_chat add column if not exists ts bigint;
alter table public.coach_chat add column if not exists created_at timestamptz not null default now();

create index if not exists idx_coach_chat_channel_ts
  on public.coach_chat (channel, ts desc);

-- ----------------------------------------------------------------------------
-- 6b. Tables d'ingestion intelligente de documents & modules dynamiques
--     Chaque document ajouté détecte sa matière et génère/enrichit les modules.
-- ----------------------------------------------------------------------------
create table if not exists public.coach_documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  mime_type text not null default 'application/octet-stream',
  file_size integer not null default 0,
  storage_url text,
  subject_key text not null,
  subject_name text not null,
  doc_type text not null default 'cours',
  detected_topics jsonb not null default '[]'::jsonb,
  action_summary text not null default '',
  reasoning text not null default '',
  created_at timestamptz not null default now()
);

alter table public.coach_documents add column if not exists filename text;
alter table public.coach_documents add column if not exists mime_type text not null default 'application/octet-stream';
alter table public.coach_documents add column if not exists file_size integer not null default 0;
alter table public.coach_documents add column if not exists storage_url text;
alter table public.coach_documents add column if not exists subject_key text;
alter table public.coach_documents add column if not exists subject_name text;
alter table public.coach_documents add column if not exists doc_type text not null default 'cours';
alter table public.coach_documents add column if not exists detected_topics jsonb not null default '[]'::jsonb;
alter table public.coach_documents add column if not exists action_summary text not null default '';
alter table public.coach_documents add column if not exists reasoning text not null default '';
alter table public.coach_documents add column if not exists created_at timestamptz not null default now();

create index if not exists idx_coach_documents_subject_created
  on public.coach_documents (subject_key, created_at desc);

create table if not exists public.coach_modules (
  id text primary key,
  document_id uuid references public.coach_documents(id) on delete cascade,
  subject_key text not null,
  module_type text not null,
  target_id text,
  operation text not null default 'create',
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_modules add column if not exists document_id uuid;
alter table public.coach_modules add column if not exists subject_key text;
alter table public.coach_modules add column if not exists module_type text;
alter table public.coach_modules add column if not exists target_id text;
alter table public.coach_modules add column if not exists operation text not null default 'create';
alter table public.coach_modules add column if not exists title text;
alter table public.coach_modules add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.coach_modules add column if not exists created_at timestamptz not null default now();
alter table public.coach_modules add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_coach_modules_subject_type
  on public.coach_modules (subject_key, module_type, created_at asc);

create index if not exists idx_coach_modules_document_id
  on public.coach_modules (document_id);

drop trigger if exists trg_coach_modules_set_updated_at on public.coach_modules;
create trigger trg_coach_modules_set_updated_at
  before update on public.coach_modules
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Sécurité Row Level Security (RLS) & Droits API PostgREST
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.subjects to anon, authenticated;
grant select, insert, update, delete on public.app_settings to anon, authenticated;
grant select, insert, update, delete on public.quizzes to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
grant select, insert, update, delete on public.coach_profiles to anon, authenticated;
grant select, insert, update, delete on public.coach_board to anon, authenticated;
grant select, insert, update, delete on public.coach_chat to anon, authenticated;
grant select, insert, update, delete on public.coach_documents to anon, authenticated;
grant select, insert, update, delete on public.coach_modules to anon, authenticated;

alter table public.subjects enable row level security;
alter table public.app_settings enable row level security;
alter table public.quizzes enable row level security;
alter table public.scores enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coach_board enable row level security;
alter table public.coach_chat enable row level security;
alter table public.coach_documents enable row level security;
alter table public.coach_modules enable row level security;

-- Politiques RLS : public.subjects
drop policy if exists "Lecture publique des subjects" on public.subjects;
create policy "Lecture publique des subjects"
  on public.subjects for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des subjects" on public.subjects;
create policy "Insertion publique des subjects"
  on public.subjects for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique des subjects" on public.subjects;
create policy "Modification publique des subjects"
  on public.subjects for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique des subjects" on public.subjects;
create policy "Suppression publique des subjects"
  on public.subjects for delete to anon, authenticated using (true);

-- Politiques RLS : public.app_settings
drop policy if exists "Lecture publique des app_settings" on public.app_settings;
create policy "Lecture publique des app_settings"
  on public.app_settings for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des app_settings" on public.app_settings;
create policy "Insertion publique des app_settings"
  on public.app_settings for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique des app_settings" on public.app_settings;
create policy "Modification publique des app_settings"
  on public.app_settings for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique des app_settings" on public.app_settings;
create policy "Suppression publique des app_settings"
  on public.app_settings for delete to anon, authenticated using (true);

-- Politiques RLS : public.quizzes
drop policy if exists "Lecture publique des quizzes" on public.quizzes;
create policy "Lecture publique des quizzes"
  on public.quizzes for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des quizzes" on public.quizzes;
create policy "Insertion publique des quizzes"
  on public.quizzes for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique des quizzes" on public.quizzes;
create policy "Modification publique des quizzes"
  on public.quizzes for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique des quizzes" on public.quizzes;
create policy "Suppression publique des quizzes"
  on public.quizzes for delete to anon, authenticated using (true);

-- Politiques RLS : public.scores
drop policy if exists "Lecture publique des scores" on public.scores;
create policy "Lecture publique des scores"
  on public.scores for select to anon, authenticated using (true);
drop policy if exists "Insertion publique des scores" on public.scores;
create policy "Insertion publique des scores"
  on public.scores for insert to anon, authenticated with check (true);

-- Politiques RLS : public.coach_profiles
drop policy if exists "Lecture publique coach_profiles" on public.coach_profiles;
create policy "Lecture publique coach_profiles"
  on public.coach_profiles for select to anon, authenticated using (true);
drop policy if exists "Insertion publique coach_profiles" on public.coach_profiles;
create policy "Insertion publique coach_profiles"
  on public.coach_profiles for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique coach_profiles" on public.coach_profiles;
create policy "Modification publique coach_profiles"
  on public.coach_profiles for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique coach_profiles" on public.coach_profiles;
create policy "Suppression publique coach_profiles"
  on public.coach_profiles for delete to anon, authenticated using (true);

-- Politiques RLS : public.coach_board
drop policy if exists "Lecture publique coach_board" on public.coach_board;
create policy "Lecture publique coach_board"
  on public.coach_board for select to anon, authenticated using (true);
drop policy if exists "Insertion publique coach_board" on public.coach_board;
create policy "Insertion publique coach_board"
  on public.coach_board for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique coach_board" on public.coach_board;
create policy "Modification publique coach_board"
  on public.coach_board for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique coach_board" on public.coach_board;
create policy "Suppression publique coach_board"
  on public.coach_board for delete to anon, authenticated using (true);

-- Politiques RLS : public.coach_chat
drop policy if exists "Lecture publique coach_chat" on public.coach_chat;
create policy "Lecture publique coach_chat"
  on public.coach_chat for select to anon, authenticated using (true);
drop policy if exists "Insertion publique coach_chat" on public.coach_chat;
create policy "Insertion publique coach_chat"
  on public.coach_chat for insert to anon, authenticated with check (true);
drop policy if exists "Suppression publique coach_chat" on public.coach_chat;
create policy "Suppression publique coach_chat"
  on public.coach_chat for delete to anon, authenticated using (true);

-- Politiques RLS : public.coach_documents
drop policy if exists "Lecture publique coach_documents" on public.coach_documents;
create policy "Lecture publique coach_documents"
  on public.coach_documents for select to anon, authenticated using (true);
drop policy if exists "Insertion publique coach_documents" on public.coach_documents;
create policy "Insertion publique coach_documents"
  on public.coach_documents for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique coach_documents" on public.coach_documents;
create policy "Modification publique coach_documents"
  on public.coach_documents for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique coach_documents" on public.coach_documents;
create policy "Suppression publique coach_documents"
  on public.coach_documents for delete to anon, authenticated using (true);

-- Politiques RLS : public.coach_modules
drop policy if exists "Lecture publique coach_modules" on public.coach_modules;
create policy "Lecture publique coach_modules"
  on public.coach_modules for select to anon, authenticated using (true);
drop policy if exists "Insertion publique coach_modules" on public.coach_modules;
create policy "Insertion publique coach_modules"
  on public.coach_modules for insert to anon, authenticated with check (true);
drop policy if exists "Modification publique coach_modules" on public.coach_modules;
create policy "Modification publique coach_modules"
  on public.coach_modules for update to anon, authenticated using (true) with check (true);
drop policy if exists "Suppression publique coach_modules" on public.coach_modules;
create policy "Suppression publique coach_modules"
  on public.coach_modules for delete to anon, authenticated using (true);

-- ----------------------------------------------------------------------------
-- 8. Bucket Supabase Storage public 'app-media' + politiques idempotentes
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('app-media', 'app-media', true)
    on conflict (id) do update set public = true;
  end if;

  if to_regclass('storage.objects') is not null then
    drop policy if exists "Lecture publique app-media" on storage.objects;
    create policy "Lecture publique app-media"
      on storage.objects for select to anon, authenticated using (bucket_id = 'app-media');

    drop policy if exists "Upload public app-media" on storage.objects;
    create policy "Upload public app-media"
      on storage.objects for insert to anon, authenticated with check (bucket_id = 'app-media');

    drop policy if exists "Modification publique app-media" on storage.objects;
    create policy "Modification publique app-media"
      on storage.objects for update to anon, authenticated using (bucket_id = 'app-media') with check (bucket_id = 'app-media');

    drop policy if exists "Suppression publique app-media" on storage.objects;
    create policy "Suppression publique app-media"
      on storage.objects for delete to anon, authenticated using (bucket_id = 'app-media');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 9. Synchronisation temps réel (Supabase Realtime) idempotente
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array[
      'subjects',
      'app_settings',
      'quizzes',
      'scores',
      'coach_profiles',
      'coach_board',
      'coach_chat',
      'coach_documents',
      'coach_modules'
    ] loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 10. Rafraîchissement immédiat du cache de schéma PostgREST
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
