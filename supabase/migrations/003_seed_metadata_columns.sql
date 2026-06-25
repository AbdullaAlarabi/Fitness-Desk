alter table body_metric_definitions
  add column if not exists category text default 'core';

alter table intake_items
  add column if not exists timing text,
  add column if not exists frequency text;
