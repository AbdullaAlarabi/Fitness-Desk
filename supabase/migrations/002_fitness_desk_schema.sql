create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  name text not null,
  day_label text,
  description text,
  position integer not null default 0,
  is_active boolean not null default true
);

create table if not exists template_exercises (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  template_id uuid not null references workout_templates(id) on delete cascade,
  exercise_name text not null,
  exercise_group text,
  equipment_type text,
  set_count integer,
  rep_range_min integer,
  rep_range_max integer,
  rest_seconds integer,
  target_rpe numeric(4,1),
  notes text,
  position integer not null default 0
);

create table if not exists scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  template_id uuid references workout_templates(id) on delete set null,
  scheduled_date date not null,
  status text not null default 'planned',
  title text not null,
  notes text
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  scheduled_workout_id uuid references scheduled_workouts(id) on delete set null,
  template_id uuid references workout_templates(id) on delete set null,
  session_date date not null,
  session_type text not null,
  duration_minutes integer,
  notes text
);

create table if not exists workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  template_exercise_id uuid references template_exercises(id) on delete set null,
  exercise_name text not null,
  exercise_group text,
  equipment_type text,
  notes text,
  position integer not null default 0
);

create table if not exists workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  workout_exercise_log_id uuid not null references workout_exercise_logs(id) on delete cascade,
  set_number integer not null,
  reps integer,
  weight_value numeric(8,2),
  weight_unit text,
  rest_seconds integer,
  rpe numeric(4,1),
  notes text
);

create table if not exists running_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  session_date date not null,
  run_type text not null,
  distance_km numeric(6,2),
  duration_seconds integer,
  pace_seconds_per_km integer,
  interval_summary text,
  rpe numeric(4,1),
  notes text
);

create table if not exists body_checkins (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  checkin_date date not null,
  checkin_type text not null default 'daily',
  notes text
);

create table if not exists body_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  key text not null,
  label text not null,
  unit text,
  value_type text not null default 'number',
  is_active boolean not null default true,
  position integer not null default 0,
  constraint body_metric_definitions_key_unique unique (workspace_id, key)
);

create table if not exists body_metric_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  body_checkin_id uuid not null references body_checkins(id) on delete cascade,
  metric_definition_id uuid not null references body_metric_definitions(id) on delete cascade,
  numeric_value numeric(10,3),
  text_value text
);

create table if not exists intake_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  name text not null,
  category text,
  default_amount numeric(10,2),
  default_unit text,
  notes text,
  is_active boolean not null default true,
  position integer not null default 0
);

create table if not exists intake_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  intake_item_id uuid not null references intake_items(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount numeric(10,2),
  unit text,
  notes text
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  name text not null,
  category text,
  target_frequency text,
  notes text,
  is_active boolean not null default true,
  position integer not null default 0
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  created_at timestamptz not null default now(),
  habit_id uuid not null references habits(id) on delete cascade,
  logged_at timestamptz not null default now(),
  status text not null default 'done',
  value numeric(10,2),
  notes text
);

create index if not exists workout_templates_workspace_idx on workout_templates (workspace_id, position);
create index if not exists template_exercises_workspace_idx on template_exercises (workspace_id, template_id, position);
create index if not exists scheduled_workouts_workspace_idx on scheduled_workouts (workspace_id, scheduled_date);
create index if not exists workout_sessions_workspace_idx on workout_sessions (workspace_id, session_date);
create index if not exists workout_exercise_logs_workspace_idx on workout_exercise_logs (workspace_id, workout_session_id, position);
create index if not exists workout_set_logs_workspace_idx on workout_set_logs (workspace_id, workout_exercise_log_id, set_number);
create index if not exists running_sessions_workspace_idx on running_sessions (workspace_id, session_date);
create index if not exists body_checkins_workspace_idx on body_checkins (workspace_id, checkin_date);
create index if not exists body_metric_definitions_workspace_idx on body_metric_definitions (workspace_id, position);
create index if not exists body_metric_values_workspace_idx on body_metric_values (workspace_id, body_checkin_id);
create index if not exists intake_items_workspace_idx on intake_items (workspace_id, position);
create index if not exists intake_logs_workspace_idx on intake_logs (workspace_id, logged_at);
create index if not exists habits_workspace_idx on habits (workspace_id, position);
create index if not exists habit_logs_workspace_idx on habit_logs (workspace_id, logged_at);
