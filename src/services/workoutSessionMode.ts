import { format, getDay } from 'date-fns';
import { getExerciseMediaConfig } from '../data/exerciseMedia';
import { emitDashboardRefresh } from '../lib/dashboardEvents';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getWorkoutPlanDayByTemplate, workoutRules, type WorkoutPlanDayConfig } from '../data/workout-plan';
import { resolveTrainingDayForDate } from './trainingCycle';
import type {
  ScheduledWorkoutRow,
  TemplateExerciseRow,
  WorkoutExerciseLogRow,
  WorkoutSessionRow,
  WorkoutSetLogRow,
  WorkoutTemplateRow
} from '../types/database';

export type WorkoutSessionType = 'gym' | 'cardio' | 'run' | 'rest' | 'custom';

export type WorkoutExerciseStep = {
  key: string;
  templateExerciseId: string | null;
  exerciseName: string;
  exerciseGroup: string | null;
  equipmentType: string | null;
  setCount: number;
  repRangeMin: number | null;
  repRangeMax: number | null;
  restSeconds: number;
  targetRpe: number | null;
  notes: string | null;
  position: number;
  targetMuscles: string | null;
  machineSetup: string | null;
  mainCue: string | null;
  commonMistake: string | null;
  alternatives: string[];
  mediaThumbnailUrl: string | null;
  mediaFullUrl: string | null;
  mediaType: 'image' | 'gif' | 'video_placeholder';
  mediaAlt: string;
  log: WorkoutExerciseLogRow | null;
  setLogs: WorkoutSetLogRow[];
};

export type WorkoutModeSnapshot = {
  dateIso: string;
  scheduledWorkout: ScheduledWorkoutRow | null;
  template: WorkoutTemplateRow | null;
  session: WorkoutSessionRow | null;
  sessionType: WorkoutSessionType;
  planConfig: WorkoutPlanDayConfig | null;
  workoutRules: readonly string[];
  exercises: WorkoutExerciseStep[];
};

export type ProgressionRecommendation = {
  tone: 'increase' | 'hold' | 'reduce';
  message: string;
};

const restDayRules = [
  'Walk 30-45 minutes.',
  'Keep the pace easy.',
  'No hard running today.',
  'No leg workout today.',
  'Hydrate.',
  'Mark complete after walking.'
] as const;

export async function getWorkoutModeSnapshot(dateIso = format(new Date(), 'yyyy-MM-dd')): Promise<WorkoutModeSnapshot> {
  const client = getSupabaseClient();
  const [scheduledResult, templateResult, sessionsResult] = await Promise.all([
    client
      .from('scheduled_workouts')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('scheduled_date', dateIso)
      .maybeSingle(),
    client.from('workout_templates').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
    client
      .from('workout_sessions')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('session_date', dateIso)
      .order('created_at')
  ]);

  if (scheduledResult.error) throw scheduledResult.error;
  if (templateResult.error) throw templateResult.error;
  if (sessionsResult.error) throw sessionsResult.error;

  const templates = (templateResult.data as WorkoutTemplateRow[]) ?? [];
  const scheduledWorkout = (scheduledResult.data as ScheduledWorkoutRow | null) ?? null;
  const session = ((sessionsResult.data as WorkoutSessionRow[]) ?? [])[0] ?? null;

  const template =
    (scheduledWorkout?.template_id
      ? templates.find((item) => item.id === scheduledWorkout.template_id)
      : null) ??
    templates.find((item) => item.name === scheduledWorkout?.title) ??
    findTemplateForDate(templates, dateIso);

  const resolvedDay = resolveTrainingDayForDate(new Date(`${dateIso}T12:00:00`), {
    scheduledWorkout,
    template
  });
  const planConfig = getWorkoutPlanDayByTemplate(template?.name, template?.day_label) ?? resolvedDay.day;

  const sessionType = planConfig?.sessionType ?? inferSessionType(scheduledWorkout?.title ?? template?.name ?? resolvedDay.day.title);

  const templateExercisesResult = template
    ? await client
        .from('template_exercises')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .eq('template_id', template.id)
        .order('position')
    : null;

  if (templateExercisesResult?.error) throw templateExercisesResult.error;

  const templateExercises = ((templateExercisesResult?.data as TemplateExerciseRow[] | undefined) ?? []).length
    ? ((templateExercisesResult?.data as TemplateExerciseRow[]) ?? [])
    : buildPlaceholderExercises(template, sessionType, planConfig);

  const exerciseLogsResult = session
    ? await client
        .from('workout_exercise_logs')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .eq('workout_session_id', session.id)
        .order('position')
    : null;

  if (exerciseLogsResult?.error) throw exerciseLogsResult.error;

  const exerciseLogs = ((exerciseLogsResult?.data as WorkoutExerciseLogRow[] | undefined) ?? []) ?? [];
  const exerciseLogIds = exerciseLogs.map((item) => item.id);

  const setLogsResult =
    session && exerciseLogIds.length > 0
      ? await client
          .from('workout_set_logs')
          .select('*')
          .eq('workspace_id', WORKSPACE_ID)
          .in('workout_exercise_log_id', exerciseLogIds)
          .order('set_number')
      : null;

  if (setLogsResult?.error) throw setLogsResult.error;

  const setLogs = ((setLogsResult?.data as WorkoutSetLogRow[] | undefined) ?? []) ?? [];

  const exercises = templateExercises.map((exercise, index) => {
    const log =
      exerciseLogs.find((item) => item.template_exercise_id === exercise.id) ??
      exerciseLogs.find((item) => item.position === exercise.position) ??
      null;
    const configExercise =
      planConfig?.exercises.find((item) => item.id === exercise.id || item.name === exercise.exercise_name) ?? null;
    const fallbackMedia = getExerciseMediaConfig(exercise.id ?? `exercise-${index + 1}`, exercise.exercise_name);
    const extractedMediaThumb = normalizeMediaAssetPath(extractCoachField(exercise.notes, 'Media thumb'));
    const extractedMediaFull = normalizeMediaAssetPath(extractCoachField(exercise.notes, 'Media full'));
    const configMediaThumb = normalizeMediaAssetPath(configExercise?.mediaThumbnailUrl ?? null);
    const configMediaFull = normalizeMediaAssetPath(configExercise?.mediaFullUrl ?? null);

    return {
      key: exercise.id ?? `placeholder-${index + 1}`,
      templateExerciseId: exercise.id ?? null,
      exerciseName: exercise.exercise_name,
      exerciseGroup: exercise.exercise_group,
      equipmentType: exercise.equipment_type,
      setCount: exercise.set_count ?? 3,
      repRangeMin: exercise.rep_range_min,
      repRangeMax: exercise.rep_range_max,
      restSeconds: exercise.rest_seconds ?? 75,
      targetRpe: exercise.target_rpe,
      notes: exercise.notes,
      position: exercise.position,
      targetMuscles: extractCoachField(exercise.notes, 'Target') ?? exercise.exercise_group,
      machineSetup: extractCoachField(exercise.notes, 'Setup'),
      mainCue: extractCoachField(exercise.notes, 'Cue'),
      commonMistake: extractCoachField(exercise.notes, 'Mistake'),
      alternatives: extractAlternatives(exercise.notes),
      mediaThumbnailUrl: extractedMediaThumb ?? configMediaThumb ?? fallbackMedia.mediaThumbnailUrl,
      mediaFullUrl: extractedMediaFull ?? configMediaFull ?? fallbackMedia.mediaFullUrl,
      mediaType:
        (extractCoachField(exercise.notes, 'Media type') as WorkoutExerciseStep['mediaType'] | null) ??
        configExercise?.mediaType ??
        fallbackMedia.mediaType,
      mediaAlt: extractCoachField(exercise.notes, 'Media alt') ?? configExercise?.mediaAlt ?? fallbackMedia.mediaAlt,
      log,
      setLogs: log ? setLogs.filter((item) => item.workout_exercise_log_id === log.id) : []
    };
  });

  return {
    dateIso,
    scheduledWorkout,
    template,
    session,
    sessionType,
    planConfig,
    workoutRules: sessionType === 'rest' ? restDayRules : workoutRules,
    exercises
  };
}

export async function ensureWorkoutSession(dateIso = format(new Date(), 'yyyy-MM-dd')) {
  const snapshot = await getWorkoutModeSnapshot(dateIso);
  if (snapshot.session) return snapshot.session;

  const client = getSupabaseClient();
  const inserted = await client
    .from('workout_sessions')
    .insert({
      workspace_id: WORKSPACE_ID,
      scheduled_workout_id: snapshot.scheduledWorkout?.id ?? null,
      template_id: snapshot.template?.id ?? null,
      session_date: dateIso,
      session_type: snapshot.sessionType,
      notes: null
    })
    .select()
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data as WorkoutSessionRow;
}

export async function saveWorkoutSet(input: {
  dateIso: string;
  sessionId: string;
  exercise: WorkoutExerciseStep;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  notes: string | null;
  restSeconds: number;
}) {
  const client = getSupabaseClient();
  const exerciseLog = await ensureExerciseLog(input.sessionId, input.exercise);

  const existing = await client
    .from('workout_set_logs')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('workout_exercise_log_id', exerciseLog.id)
    .eq('set_number', input.setNumber)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const payload = {
    reps: input.reps,
    weight_value: input.weightKg,
    weight_unit: input.weightKg !== null ? 'kg' : null,
    rest_seconds: input.restSeconds,
    completed: true,
    notes: input.notes
  };

  if (existing.data) {
    const updated = await client
      .from('workout_set_logs')
      .update(payload)
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', existing.data.id)
      .select()
      .single();

    if (updated.error) throw updated.error;
    emitDashboardRefresh();
    return updated.data as WorkoutSetLogRow;
  }

  const inserted = await client
    .from('workout_set_logs')
    .insert({
      workspace_id: WORKSPACE_ID,
      workout_exercise_log_id: exerciseLog.id,
      set_number: input.setNumber,
      ...payload
    })
    .select()
    .single();

  if (inserted.error) throw inserted.error;
  emitDashboardRefresh();
  return inserted.data as WorkoutSetLogRow;
}

export async function completeWorkoutSession(input: {
  sessionId: string;
  scheduledWorkoutId: string | null;
  durationMinutes: number | null;
  notes: string | null;
}) {
  const client = getSupabaseClient();

  const sessionUpdate = await client
    .from('workout_sessions')
    .update({
      duration_minutes: input.durationMinutes,
      notes: input.notes
    })
    .eq('workspace_id', WORKSPACE_ID)
    .eq('id', input.sessionId);

  if (sessionUpdate.error) {
    throw sessionUpdate.error;
  }

  if (input.scheduledWorkoutId) {
    const workoutUpdate = await client
      .from('scheduled_workouts')
      .update({
        status: 'completed'
      })
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', input.scheduledWorkoutId);

    if (workoutUpdate.error) throw workoutUpdate.error;
  }

  emitDashboardRefresh();
}

export function getProgressionSuggestion(exercise: WorkoutExerciseStep) {
  const recommendation = getProgressionRecommendation(exercise);
  return recommendation?.message ?? null;
}

export function getProgressionRecommendation(exercise: WorkoutExerciseStep): ProgressionRecommendation | null {
  const topRep = exercise.repRangeMax;
  const bottomRep = exercise.repRangeMin;
  if (!topRep || !bottomRep || exercise.setLogs.length < exercise.setCount) return null;
  const allAtTop = exercise.setLogs.every((setLog) => (setLog.reps ?? 0) >= topRep);
  const anyBelowMin = exercise.setLogs.some((setLog) => (setLog.reps ?? 0) < bottomRep);
  const lastWeight = exercise.setLogs[exercise.setLogs.length - 1]?.weight_value ?? null;

  if (allAtTop && lastWeight !== null) {
    return {
      tone: 'increase',
      message: `Increase weight next time. All sets hit ${topRep} reps with clean entries.`
    };
  }

  if (anyBelowMin) {
    return {
      tone: 'reduce',
      message: `Reduce weight slightly or repeat this load. One or more sets missed ${bottomRep} reps.`
    };
  }

  return {
    tone: 'hold',
    message: 'Keep the same weight next time. Build clean reps until all sets reach the top range.'
  };
}

async function ensureExerciseLog(sessionId: string, exercise: WorkoutExerciseStep) {
  const client = getSupabaseClient();

  if (exercise.log) {
    const updated = await client
      .from('workout_exercise_logs')
      .update({
        notes: exercise.notes
      })
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', exercise.log.id)
      .select()
      .single();

    if (updated.error) throw updated.error;
    return updated.data as WorkoutExerciseLogRow;
  }

  const inserted = await client
    .from('workout_exercise_logs')
    .insert({
      workspace_id: WORKSPACE_ID,
      workout_session_id: sessionId,
      template_exercise_id: exercise.templateExerciseId,
      exercise_name: exercise.exerciseName,
      exercise_group: exercise.exerciseGroup,
      equipment_type: exercise.equipmentType,
      notes: exercise.notes,
      position: exercise.position
    })
    .select()
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data as WorkoutExerciseLogRow;
}

function inferSessionType(name: string): WorkoutSessionType {
  const normalized = name.toLowerCase();
  if (normalized.includes('rest') || normalized.includes('walking')) return 'rest';
  if (normalized.includes('run')) return 'run';
  if (normalized.includes('cardio')) return 'cardio';
  if (normalized.includes('push') || normalized.includes('pull') || normalized.includes('legs') || normalized.includes('upper')) {
    return 'gym';
  }
  if (!normalized) return 'custom';
  return 'gym';
}

function buildPlaceholderExercises(
  template: WorkoutTemplateRow | null,
  sessionType: WorkoutSessionType,
  planConfig: WorkoutPlanDayConfig | null
): TemplateExerciseRow[] {
  if (planConfig?.detailLevel === 'exact' && planConfig.exercises.length > 0) {
    return planConfig.exercises.map((exercise, index) => ({
      id: `config-${exercise.id}`,
      workspace_id: WORKSPACE_ID,
      created_at: new Date(0).toISOString(),
      template_id: 'config-template',
      exercise_name: exercise.name,
      exercise_group: exercise.targetMuscles,
      equipment_type: exercise.category,
      set_count: exercise.sets,
      rep_range_min: exercise.minReps,
      rep_range_max: exercise.maxReps,
      rest_seconds: exercise.restSeconds,
      target_rpe: null,
      notes: [
        exercise.note,
        `Target: ${exercise.targetMuscles}`,
        `Setup: ${exercise.machineSetup}`,
        `Cue: ${exercise.mainCue}`,
        `Mistake: ${exercise.commonMistake}`,
        `Alternatives: ${exercise.alternatives.join(' / ')}`
      ].join(' | '),
      position: index + 1
    }));
  }

  if (sessionType !== 'gym') return [];

  const title = template?.name ?? 'Gym Session';
  return [
    placeholderExercise(`${title} Main Movement`, 1, 3, 8, 10, 90, 'Primary lift placeholder. Add exact machine later.'),
    placeholderExercise(`${title} Secondary Movement`, 2, 3, 10, 12, 75, 'Controlled secondary lift placeholder.'),
    placeholderExercise(`${title} Finisher`, 3, 3, 12, 15, 60, 'Accessory finisher placeholder. Optional final isolation set can push harder.')
  ];
}

function placeholderExercise(
  exerciseName: string,
  position: number,
  setCount: number,
  repMin: number,
  repMax: number,
  restSeconds: number,
  notes: string
): TemplateExerciseRow {
  return {
    id: `placeholder-${position}`,
    workspace_id: WORKSPACE_ID,
    created_at: new Date(0).toISOString(),
    template_id: 'placeholder-template',
    exercise_name: exerciseName,
    exercise_group: 'placeholder',
    equipment_type: 'machine/cable',
    set_count: setCount,
    rep_range_min: repMin,
    rep_range_max: repMax,
    rest_seconds: restSeconds,
    target_rpe: null,
    notes,
    position
  };
}

function extractCoachField(notes: string | null | undefined, label: string) {
  if (!notes) return null;
  const segment = notes
    .split('|')
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  if (!segment) return null;
  return segment.slice(label.length + 1).trim() || null;
}

function extractAlternatives(notes: string | null | undefined) {
  const raw = extractCoachField(notes, 'Alternatives');
  return raw ? raw.split('/').map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeMediaAssetPath(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('coach-media/')) return null;
  return trimmed;
}

function findTemplateForDate(templates: WorkoutTemplateRow[], dateIso: string) {
  const date = new Date(`${dateIso}T12:00:00`);
  const dayNumber = getDay(date);
  const dayLabel = `Day ${dayNumber === 0 ? 7 : dayNumber}`;
  return templates.find((template) => template.day_label === dayLabel) ?? null;
}
