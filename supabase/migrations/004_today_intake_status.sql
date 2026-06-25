alter table intake_logs
  add column if not exists status text not null default 'taken';
