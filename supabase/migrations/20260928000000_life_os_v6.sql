-- GOJO × TOJI Life OS v6. All application rows are private to auth.uid().
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text, height_cm numeric, starting_weight_kg numeric,
  target_kcal integer, goal_gojo_pct integer, goal_toji_pct integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null, workout_day text not null, duration_minutes integer,
  energy numeric, post_soreness numeric, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create index workout_sessions_user_date on public.workout_sessions(user_id,workout_date desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null, exercise_name text not null, set_number integer not null, position integer,
  weight_kg numeric, reps integer, rir numeric, completed boolean not null default false,
  muscles text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(session_id,user_id) references public.workout_sessions(id,user_id) on delete cascade
);
create index workout_sets_user_session on public.workout_sets(user_id,session_id);
create index workout_sets_session_user on public.workout_sets(session_id,user_id);

create table public.body_checkins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null, weight_kg numeric, waist_cm numeric, sleep_hours numeric, steps integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,checkin_date)
);
create index body_checkins_user_date on public.body_checkins(user_id,checkin_date desc);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  measurement_date date not null, chest_cm numeric, arm_cm numeric, thigh_cm numeric, waist_cm numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,measurement_date)
);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null, kcal integer, protein_g numeric, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,log_date)
);

create table public.readiness_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null, sleep_hours numeric, energy numeric, soreness numeric, stress numeric,
  wrist_discomfort numeric, calculated_score numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,log_date)
);

create table public.school_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  external_id text, type text not null check(type in ('homework','exam','quiz','other')),
  subject text not null, title text not null, due_date date, priority integer not null default 1,
  source text not null default 'manual', completed boolean not null default false,
  upstream_updated_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index school_items_user_due on public.school_items(user_id,due_date) where deleted_at is null;
create unique index school_items_upstream_key on public.school_items(user_id,source,external_id) where external_id is not null;

create table public.school_lessons (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null, lesson_date date not null, subject text not null,
  start_time time, end_time time, room text, teacher text, status text,
  source text not null default 'eduvulcan', deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,source,external_id)
);
create index school_lessons_user_date on public.school_lessons(user_id,lesson_date) where deleted_at is null;

create table public.school_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'not_configured', last_sync_at timestamptz,
  last_success_at timestamptz, last_error text, status text not null default 'NOT_CONFIGURED',
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  training_plan jsonb not null default '{}'::jsonb, rest_timer_seconds integer not null default 120,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- A dedicated revocable calendar capability. Only the SHA-256 hash is stored.
create table public.calendar_tokens (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique, label text, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index calendar_tokens_user on public.calendar_tokens(user_id);

do $$ declare t text; begin
  foreach t in array array[
    'profiles','workout_sessions','workout_sets','body_checkins','body_measurements',
    'nutrition_logs','readiness_logs','school_items','school_lessons',
    'school_sync_state','user_settings','calendar_tokens'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('create policy own_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',t);
    execute format('create policy own_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',t);
  end loop;
end $$;

-- Calendar tokens are read only by the server function with a server-side
-- Supabase secret key. No public SECURITY DEFINER RPC bypasses RLS.
