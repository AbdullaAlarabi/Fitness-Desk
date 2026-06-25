-- Fitness Desk private-mode backend repair
-- Apply this in the existing Supabase project SQL Editor.
-- This script is idempotent and does not drop, truncate, or delete data.

-- Missing columns required by the current frontend
alter table if exists body_metric_definitions
  add column if not exists category text default 'core';

alter table if exists intake_items
  add column if not exists timing text,
  add column if not exists frequency text;

alter table if exists intake_logs
  add column if not exists status text not null default 'taken';

alter table if exists intake_logs
  add column if not exists intake_date date;

update intake_logs
set intake_date = coalesce(intake_date, logged_at::date)
where intake_date is null;

alter table if exists intake_logs
  alter column intake_date set not null;

create unique index if not exists intake_logs_workspace_item_day_unique_idx
  on intake_logs (workspace_id, intake_item_id, intake_date);

alter table if exists running_sessions
  add column if not exists target_pace_seconds_per_km integer;

alter table if exists workout_sessions
  add column if not exists overall_rpe integer check (overall_rpe between 1 and 10);

alter table if exists workout_set_logs
  add column if not exists completed boolean not null default true;

alter table if exists running_sessions
  add column if not exists treadmill_speed_kmh numeric(5,2);

-- Disable RLS for private personal-mode app access
alter table if exists workout_templates disable row level security;
alter table if exists template_exercises disable row level security;
alter table if exists scheduled_workouts disable row level security;
alter table if exists workout_sessions disable row level security;
alter table if exists workout_exercise_logs disable row level security;
alter table if exists workout_set_logs disable row level security;
alter table if exists running_sessions disable row level security;
alter table if exists body_checkins disable row level security;
alter table if exists body_metric_definitions disable row level security;
alter table if exists body_metric_values disable row level security;
alter table if exists intake_items disable row level security;
alter table if exists intake_logs disable row level security;

-- Grants for Supabase REST access via anon/publishable key
grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;
