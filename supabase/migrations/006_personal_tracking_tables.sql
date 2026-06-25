create or replace function set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'abdulla-fitness-desk',
  entry_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  energy_level smallint null check (energy_level between 1 and 5),
  sleep_hours numeric(3,1) null check (sleep_hours >= 0 and sleep_hours <= 24),
  soreness_level smallint null check (soreness_level between 1 and 5),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_checkins_workspace_date_unique unique (workspace_id, entry_date)
);

create table if not exists weekly_body_scans (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'abdulla-fitness-desk',
  entry_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  body_fat_pct numeric(5,2) null check (body_fat_pct >= 0 and body_fat_pct <= 100),
  bmi numeric(5,2) null check (bmi >= 0),
  bmr_kcal integer null check (bmr_kcal >= 0),
  water_pct numeric(5,2) null check (water_pct >= 0 and water_pct <= 100),
  visceral_fat numeric(5,2) null check (visceral_fat >= 0),
  bone_mass_kg numeric(5,2) null check (bone_mass_kg >= 0),
  protein_pct numeric(5,2) null check (protein_pct >= 0 and protein_pct <= 100),
  skeletal_muscle_mass_kg numeric(5,2) null check (skeletal_muscle_mass_kg >= 0),
  subcutaneous_fat_pct numeric(5,2) null check (subcutaneous_fat_pct >= 0 and subcutaneous_fat_pct <= 100),
  body_age integer null check (body_age >= 0),
  body_type text null,
  waist_cm numeric(5,2) null check (waist_cm >= 0),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_body_scans_workspace_date_unique unique (workspace_id, entry_date)
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'abdulla-fitness-desk',
  workout_date date not null,
  workout_day integer null check (workout_day between 1 and 7),
  workout_title text not null,
  status text not null check (status in ('planned', 'completed', 'skipped', 'shifted')),
  duration_minutes integer null check (duration_minutes >= 0),
  overall_rpe integer null check (overall_rpe between 1 and 10),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exercise_set_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'abdulla-fitness-desk',
  workout_log_id uuid not null references workout_logs(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  target_reps_min integer null check (target_reps_min > 0),
  target_reps_max integer null check (target_reps_max > 0),
  actual_reps integer null check (actual_reps >= 0),
  weight_kg numeric(6,2) null check (weight_kg >= 0),
  rpe integer null check (rpe between 1 and 10),
  completed boolean not null default false,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_set_logs_target_rep_range_check
    check (
      target_reps_min is null
      or target_reps_max is null
      or target_reps_min <= target_reps_max
    )
);

create index if not exists daily_checkins_workspace_date_idx
  on daily_checkins (workspace_id, entry_date desc);

create index if not exists weekly_body_scans_workspace_date_idx
  on weekly_body_scans (workspace_id, entry_date desc);

create index if not exists workout_logs_workspace_date_idx
  on workout_logs (workspace_id, workout_date desc);

create index if not exists workout_logs_workspace_status_idx
  on workout_logs (workspace_id, status);

create index if not exists exercise_set_logs_workout_idx
  on exercise_set_logs (workout_log_id, set_number);

create index if not exists exercise_set_logs_workspace_workout_idx
  on exercise_set_logs (workspace_id, workout_log_id);

drop trigger if exists set_daily_checkins_updated_at on daily_checkins;
create trigger set_daily_checkins_updated_at
before update on daily_checkins
for each row
execute function set_updated_at_timestamp();

drop trigger if exists set_weekly_body_scans_updated_at on weekly_body_scans;
create trigger set_weekly_body_scans_updated_at
before update on weekly_body_scans
for each row
execute function set_updated_at_timestamp();

drop trigger if exists set_workout_logs_updated_at on workout_logs;
create trigger set_workout_logs_updated_at
before update on workout_logs
for each row
execute function set_updated_at_timestamp();

drop trigger if exists set_exercise_set_logs_updated_at on exercise_set_logs;
create trigger set_exercise_set_logs_updated_at
before update on exercise_set_logs
for each row
execute function set_updated_at_timestamp();
