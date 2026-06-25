alter table workout_sessions
  add column if not exists overall_rpe integer check (overall_rpe between 1 and 10);

alter table workout_set_logs
  add column if not exists completed boolean not null default true;
