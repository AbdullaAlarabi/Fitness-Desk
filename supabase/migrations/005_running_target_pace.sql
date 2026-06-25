alter table running_sessions
  add column if not exists target_pace_seconds_per_km integer;
