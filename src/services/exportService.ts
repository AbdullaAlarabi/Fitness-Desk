import { SUPABASE_ANON_KEY, SUPABASE_URL, WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import type {
  BodyCheckinRow,
  BodyMetricDefinitionRow,
  BodyMetricValueRow,
  IntakeItemRow,
  IntakeLogRow,
  RunningSessionRow,
  ScheduledWorkoutRow,
  WorkoutExerciseLogRow,
  WorkoutSessionRow,
  WorkoutSetLogRow
} from '../types/database';

export type ExportDatasetKey = 'daily_checkins' | 'weekly_body_scans' | 'workout_logs' | 'intake_logs' | 'run_tests';
export type ExportFormat = 'json' | 'csv';

export async function exportDataset(dataset: ExportDatasetKey, format: ExportFormat) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Add the environment variables before exporting data.');
  }

  const rows = await collectDatasetRows(dataset);
  const payload = format === 'json' ? JSON.stringify(rows, null, 2) : toCsv(rows);
  const mimeType = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
  const extension = format === 'json' ? 'json' : 'csv';
  downloadFile(`${dataset}-${new Date().toISOString().slice(0, 10)}.${extension}`, payload, mimeType);
  return rows.length;
}

export async function getExportCounts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      daily_checkins: 0,
      weekly_body_scans: 0,
      workout_logs: 0,
      intake_logs: 0,
      run_tests: 0
    } satisfies Record<ExportDatasetKey, number>;
  }

  return {
    daily_checkins: (await collectDatasetRows('daily_checkins')).length,
    weekly_body_scans: (await collectDatasetRows('weekly_body_scans')).length,
    workout_logs: (await collectDatasetRows('workout_logs')).length,
    intake_logs: (await collectDatasetRows('intake_logs')).length,
    run_tests: (await collectDatasetRows('run_tests')).length
  } satisfies Record<ExportDatasetKey, number>;
}

async function collectDatasetRows(dataset: ExportDatasetKey) {
  switch (dataset) {
    case 'daily_checkins':
      return collectDailyCheckins();
    case 'weekly_body_scans':
      return collectWeeklyBodyScans();
    case 'workout_logs':
      return collectWorkoutLogs();
    case 'intake_logs':
      return collectIntakeLogs();
    case 'run_tests':
      return collectRunTests();
  }
}

async function collectDailyCheckins() {
  const client = getSupabaseClient();
  const [checkinsResult, definitionsResult, valuesResult] = await Promise.all([
    client.from('body_checkins').select('*').eq('workspace_id', WORKSPACE_ID).eq('checkin_type', 'daily').order('checkin_date'),
    client.from('body_metric_definitions').select('*').eq('workspace_id', WORKSPACE_ID).order('position'),
    client.from('body_metric_values').select('*').eq('workspace_id', WORKSPACE_ID).order('created_at')
  ]);

  if (checkinsResult.error) throw checkinsResult.error;
  if (definitionsResult.error) throw definitionsResult.error;
  if (valuesResult.error) throw valuesResult.error;

  return mapBodyCheckins(
    (checkinsResult.data as BodyCheckinRow[]) ?? [],
    (definitionsResult.data as BodyMetricDefinitionRow[]) ?? [],
    (valuesResult.data as BodyMetricValueRow[]) ?? [],
    ['weight', 'energy_level', 'sleep_hours', 'soreness_level']
  );
}

async function collectWeeklyBodyScans() {
  const client = getSupabaseClient();
  const [checkinsResult, definitionsResult, valuesResult] = await Promise.all([
    client.from('body_checkins').select('*').eq('workspace_id', WORKSPACE_ID).eq('checkin_type', 'weekly').order('checkin_date'),
    client.from('body_metric_definitions').select('*').eq('workspace_id', WORKSPACE_ID).order('position'),
    client.from('body_metric_values').select('*').eq('workspace_id', WORKSPACE_ID).order('created_at')
  ]);

  if (checkinsResult.error) throw checkinsResult.error;
  if (definitionsResult.error) throw definitionsResult.error;
  if (valuesResult.error) throw valuesResult.error;

  return mapBodyCheckins(
    (checkinsResult.data as BodyCheckinRow[]) ?? [],
    (definitionsResult.data as BodyMetricDefinitionRow[]) ?? [],
    (valuesResult.data as BodyMetricValueRow[]) ?? [],
    [
      'weight',
      'body_fat',
      'muscle_mass',
      'bmr',
      'body_water',
      'visceral_fat',
      'bone_mass',
      'protein',
      'skeletal_muscle_mass',
      'subcutaneous_mass',
      'body_age',
      'body_type',
      'waist_cm',
      'bmi',
      'body_fat_mass',
      'lean_body_mass'
    ]
  );
}

async function collectWorkoutLogs() {
  const client = getSupabaseClient();
  const [scheduledResult, sessionsResult, exerciseLogsResult, setLogsResult] = await Promise.all([
    client.from('scheduled_workouts').select('*').eq('workspace_id', WORKSPACE_ID).order('scheduled_date'),
    client.from('workout_sessions').select('*').eq('workspace_id', WORKSPACE_ID).order('session_date'),
    client.from('workout_exercise_logs').select('*').eq('workspace_id', WORKSPACE_ID).order('position'),
    client.from('workout_set_logs').select('*').eq('workspace_id', WORKSPACE_ID).order('set_number')
  ]);

  if (scheduledResult.error) throw scheduledResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (exerciseLogsResult.error) throw exerciseLogsResult.error;
  if (setLogsResult.error) throw setLogsResult.error;

  const scheduled = (scheduledResult.data as ScheduledWorkoutRow[]) ?? [];
  const sessions = (sessionsResult.data as WorkoutSessionRow[]) ?? [];
  const exerciseLogs = (exerciseLogsResult.data as WorkoutExerciseLogRow[]) ?? [];
  const setLogs = (setLogsResult.data as WorkoutSetLogRow[]) ?? [];

  return sessions.map((session) => {
    const scheduledWorkout = scheduled.find((item) => item.id === session.scheduled_workout_id) ?? null;
    const sessionExerciseLogs = exerciseLogs.filter((item) => item.workout_session_id === session.id);
    const sessionSetCount = sessionExerciseLogs.reduce(
      (sum, exerciseLog) => sum + setLogs.filter((setLog) => setLog.workout_exercise_log_id === exerciseLog.id).length,
      0
    );

    return {
      session_date: session.session_date,
      title: scheduledWorkout?.title ?? 'Session',
      status: scheduledWorkout?.status ?? 'logged',
      duration_minutes: session.duration_minutes,
      overall_rpe: session.overall_rpe,
      exercise_count: sessionExerciseLogs.length,
      set_count: sessionSetCount,
      notes: session.notes
    };
  });
}

async function collectIntakeLogs() {
  const client = getSupabaseClient();
  const [logsResult, itemsResult] = await Promise.all([
    client.from('intake_logs').select('*').eq('workspace_id', WORKSPACE_ID).order('intake_date'),
    client.from('intake_items').select('*').eq('workspace_id', WORKSPACE_ID).order('position')
  ]);

  if (logsResult.error) throw logsResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const logs = (logsResult.data as IntakeLogRow[]) ?? [];
  const items = (itemsResult.data as IntakeItemRow[]) ?? [];

  return logs.map((log) => {
    const item = items.find((row) => row.id === log.intake_item_id) ?? null;
    return {
      intake_date: log.intake_date,
      item: item?.name ?? 'Unknown',
      timing: item?.timing ?? null,
      status: log.status,
      amount: log.amount,
      unit: log.unit,
      notes: log.notes
    };
  });
}

async function collectRunTests() {
  const client = getSupabaseClient();
  const result = await client
    .from('running_sessions')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('distance_km', 3.2)
    .order('session_date');

  if (result.error) throw result.error;

  const runs = (result.data as RunningSessionRow[]) ?? [];
  return runs.map((run) => ({
    session_date: run.session_date,
    run_type: run.run_type,
    distance_km: run.distance_km,
    duration_seconds: run.duration_seconds,
    pace_seconds_per_km: run.pace_seconds_per_km,
    target_pace_seconds_per_km: run.target_pace_seconds_per_km,
    treadmill_speed_kmh: run.treadmill_speed_kmh,
    rpe: run.rpe,
    notes: run.notes
  }));
}

function mapBodyCheckins(
  checkins: BodyCheckinRow[],
  definitions: BodyMetricDefinitionRow[],
  values: BodyMetricValueRow[],
  keys: string[]
) {
  return checkins.map((checkin) => {
    const row: Record<string, string | number | null> = {
      checkin_date: checkin.checkin_date,
      notes: checkin.notes
    };

    for (const key of keys) {
      const definition = definitions.find((item) => item.key === key);
      if (!definition) {
        row[key] = null;
        continue;
      }
      const value = values.find(
        (item) => item.body_checkin_id === checkin.id && item.metric_definition_id === definition.id
      );
      row[key] = value?.numeric_value ?? value?.text_value ?? null;
    }

    return row;
  });
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

