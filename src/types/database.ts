export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Uuid = string;

export type BaseRow = {
  id: Uuid;
  workspace_id: string;
  created_at: string;
};

export type WorkoutTemplateRow = BaseRow & {
  name: string;
  day_label: string | null;
  description: string | null;
  position: number;
  is_active: boolean;
};

export type TemplateExerciseRow = BaseRow & {
  template_id: Uuid;
  exercise_name: string;
  exercise_group: string | null;
  equipment_type: string | null;
  set_count: number | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  rest_seconds: number | null;
  target_rpe: number | null;
  notes: string | null;
  position: number;
};

export type ScheduledWorkoutRow = BaseRow & {
  template_id: Uuid | null;
  scheduled_date: string;
  status: string;
  title: string;
  notes: string | null;
};

export type WorkoutSessionRow = BaseRow & {
  scheduled_workout_id: Uuid | null;
  template_id: Uuid | null;
  session_date: string;
  session_type: string;
  duration_minutes: number | null;
  overall_rpe?: number | null;
  notes: string | null;
};

export type WorkoutExerciseLogRow = BaseRow & {
  workout_session_id: Uuid;
  template_exercise_id: Uuid | null;
  exercise_name: string;
  exercise_group: string | null;
  equipment_type: string | null;
  notes: string | null;
  position: number;
};

export type WorkoutSetLogRow = BaseRow & {
  workout_exercise_log_id: Uuid;
  set_number: number;
  reps: number | null;
  weight_value: number | null;
  weight_unit: string | null;
  rest_seconds: number | null;
  rpe: number | null;
  completed?: boolean;
  notes: string | null;
};

export type RunningSessionRow = BaseRow & {
  session_date: string;
  run_type: string;
  distance_km: number | null;
  duration_seconds: number | null;
  pace_seconds_per_km: number | null;
  target_pace_seconds_per_km?: number | null;
  treadmill_speed_kmh?: number | null;
  interval_summary: string | null;
  rpe: number | null;
  notes: string | null;
};

export type BodyCheckinRow = BaseRow & {
  checkin_date: string;
  checkin_type: string;
  notes: string | null;
};

export type BodyMetricDefinitionRow = BaseRow & {
  key: string;
  label: string;
  unit: string | null;
  value_type: string;
  category?: string | null;
  is_active: boolean;
  position: number;
};

export type BodyMetricValueRow = BaseRow & {
  body_checkin_id: Uuid;
  metric_definition_id: Uuid;
  numeric_value: number | null;
  text_value: string | null;
};

export type IntakeItemRow = BaseRow & {
  name: string;
  category: string | null;
  timing?: string | null;
  frequency?: string | null;
  default_amount: number | null;
  default_unit: string | null;
  notes: string | null;
  is_active: boolean;
  position: number;
};

export type IntakeLogRow = BaseRow & {
  intake_item_id: Uuid;
  logged_at: string;
  intake_date?: string;
  status?: string;
  amount: number | null;
  unit: string | null;
  notes: string | null;
};

export type HabitRow = BaseRow & {
  name: string;
  category: string | null;
  target_frequency: string | null;
  notes: string | null;
  is_active: boolean;
  position: number;
};

export type HabitLogRow = BaseRow & {
  habit_id: Uuid;
  logged_at: string;
  status: string;
  value: number | null;
  notes: string | null;
};

export type InsertRow<T extends BaseRow> = Omit<T, 'id' | 'created_at' | 'workspace_id'>;
export type UpdateRow<T extends BaseRow> = Partial<InsertRow<T>>;
