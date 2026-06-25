alter table intake_logs
  add column if not exists intake_date date;

update intake_logs
set intake_date = coalesce(intake_date, logged_at::date)
where intake_date is null;

alter table intake_logs
  alter column intake_date set not null;

create unique index if not exists intake_logs_workspace_item_day_unique_idx
  on intake_logs (workspace_id, intake_item_id, intake_date);
