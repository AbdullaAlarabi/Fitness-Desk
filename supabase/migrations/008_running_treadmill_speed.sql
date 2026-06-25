alter table running_sessions
  add column if not exists treadmill_speed_kmh numeric(5,2);
