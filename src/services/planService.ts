import { addDays, format, isBefore } from 'date-fns';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getAppNow } from '../lib/appClock';
import type { ScheduledWorkoutRow, WorkoutSessionRow, WorkoutTemplateRow } from '../types/database';
import { getTrainingCycleStart, getWorkoutPlanDayForDate, type WorkoutPlanDayConfig } from '../data/workout-plan';
import { getFitnessDeskState, type FitnessDeskPlanDay } from './fitnessDeskState';

export type PlanStatus = 'ready' | 'planned' | 'in_progress' | 'completed' | 'skipped' | 'shifted' | 'rest' | 'missed';

export type PlanDay = {
  date: Date;
  dateIso: string;
  template: WorkoutTemplateRow | null;
  scheduledWorkout: ScheduledWorkoutRow | null;
  session: WorkoutSessionRow | null;
  cycleDay: WorkoutPlanDayConfig;
  name: string;
  focus: string;
  durationMinutes: number;
  status: PlanStatus;
  isRest: boolean;
};

export type PlanWeekSnapshot = {
  weekStart: Date;
  days: PlanDay[];
  cycleShifted: boolean;
};

export type ShiftOptions = {
  sourceDateIso: string;
  shiftRemaining: boolean;
  useRecoveryDays: boolean;
};

export async function getPlanDayByDate(dateIso: string, now = getAppNow()) {
  const snapshot = await getPlanWeekSnapshot(now);
  return snapshot.days.find((day) => day.dateIso === dateIso) ?? null;
}

export async function getPlanWeekSnapshot(now = getAppNow()): Promise<PlanWeekSnapshot> {
  const state = await getFitnessDeskState(now);
  const weekStart = getTrainingCycleStart(now);
  const days: PlanDay[] = state.weeklyPlan.map((day) => ({
    date: day.date,
    dateIso: day.dateIso,
    template: day.template,
    scheduledWorkout: day.scheduledWorkout,
    session: day.session,
    cycleDay: day.cycleDay,
    name: day.name,
    focus: day.focus,
    durationMinutes: day.durationMin,
    status: day.status,
    isRest: day.isRest
  }));
  return { weekStart, days, cycleShifted: detectCycleShifted(state.weeklyPlan) };
}

export async function startPlanDay(day: PlanDay) {
  if (day.isRest) return;
  await upsertScheduledWorkout(day.dateIso, day.template, day.cycleDay, 'planned');
}

export async function markPlanDayStatus(day: PlanDay, status: Exclude<PlanStatus, 'rest' | 'missed'>) {
  if (!day.template && !day.scheduledWorkout && !day.cycleDay) return;
  const template = day.template ?? null;
  await upsertScheduledWorkout(day.dateIso, template, day.cycleDay, status);
}

export async function markPlanDayStatusByDate(dateIso: string, status: Exclude<PlanStatus, 'rest' | 'missed'>, now = getAppNow()) {
  const day = await getPlanDayByDate(dateIso, now);
  if (!day) {
    throw new Error('Workout day not found in the current weekly plan.');
  }

  await markPlanDayStatus(day, status);
  return day;
}

export async function resetPlanDay(day: PlanDay) {
  const client = getSupabaseClient();
  const sessionsResult = await client
    .from('workout_sessions')
    .select('id')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('session_date', day.dateIso);

  if (sessionsResult.error) throw sessionsResult.error;

  const sessionIds = ((sessionsResult.data as Array<{ id: string }> | null) ?? []).map((session) => session.id);

  if (sessionIds.length > 0) {
    const deleteSessions = await client
      .from('workout_sessions')
      .delete()
      .eq('workspace_id', WORKSPACE_ID)
      .in('id', sessionIds);

    if (deleteSessions.error) throw deleteSessions.error;
  }

  const deleteRuns = await client
    .from('running_sessions')
    .delete()
    .eq('workspace_id', WORKSPACE_ID)
    .eq('session_date', day.dateIso);

  if (deleteRuns.error) throw deleteRuns.error;

  if (!day.scheduledWorkout) return;

  const deleteScheduled = await client
    .from('scheduled_workouts')
    .delete()
    .eq('workspace_id', WORKSPACE_ID)
    .eq('id', day.scheduledWorkout.id);

  if (deleteScheduled.error) throw deleteScheduled.error;
}

export async function movePlanDay(day: PlanDay, targetDateIso: string) {
  await upsertScheduledWorkout(targetDateIso, day.template, day.cycleDay, 'planned');
  await upsertScheduledWorkout(day.dateIso, day.template, day.cycleDay, 'shifted');
}

export async function shiftPlanForward(options: ShiftOptions, now = getAppNow()) {
  const { sourceDateIso, shiftRemaining, useRecoveryDays } = options;
  const horizon = await getPlanHorizon(now, 14);
  const sourceIndex = horizon.findIndex((item) => item.dateIso === sourceDateIso);

  if (sourceIndex === -1) {
    throw new Error('Source day was not found in the current plan horizon.');
  }

  const sourceDay = horizon[sourceIndex];
  if (sourceDay.isRest || !sourceDay.template) {
    throw new Error('Rest days cannot be shifted as structured workouts.');
  }

  const affectedDays = shiftRemaining
    ? horizon.slice(sourceIndex).filter((item) => !item.isRest && item.template)
    : [sourceDay];

  const eligibleTargets = horizon.slice(sourceIndex + 1).filter((item) => {
    if (item.status === 'completed') return false;
    if (useRecoveryDays) return true;
    return !item.isRest;
  });

  if (eligibleTargets.length < affectedDays.length) {
    throw new Error('Not enough future slots to shift this workout chain. Enable recovery days or use Move.');
  }

  for (let index = 0; index < affectedDays.length; index += 1) {
    const source = affectedDays[index];
    const target = eligibleTargets[index];
    await upsertScheduledWorkout(source.dateIso, source.template, source.cycleDay, 'shifted');
    await upsertScheduledWorkout(target.dateIso, source.template, source.cycleDay, 'planned');
  }
}

async function getPlanHorizon(now: Date, length: number) {
  const client = getSupabaseClient();
  const weekStart = getTrainingCycleStart(now);
  const end = addDays(weekStart, length - 1);

  const [templateResult, scheduledResult] = await Promise.all([
    client.from('workout_templates').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
    client
      .from('scheduled_workouts')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(end, 'yyyy-MM-dd'))
      .order('scheduled_date')
  ]);

  if (templateResult.error) throw templateResult.error;
  if (scheduledResult.error) throw scheduledResult.error;

  const templates = (templateResult.data as WorkoutTemplateRow[]) ?? [];
  const scheduled = (scheduledResult.data as ScheduledWorkoutRow[]) ?? [];

  return Array.from({ length }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateIso = format(date, 'yyyy-MM-dd');
    const weekIndex = index % 7;
    const template = templates.find((item) => item.day_label === `Day ${weekIndex + 1}`) ?? null;
    const scheduledWorkout = scheduled.find((item) => item.scheduled_date === dateIso) ?? null;
    return derivePlanDay(date, dateIso, template, scheduledWorkout, now);
  });
}

function derivePlanDay(
  date: Date,
  dateIso: string,
  template: WorkoutTemplateRow | null,
  scheduledWorkout: ScheduledWorkoutRow | null,
  now: Date
): PlanDay {
  const fallbackConfig = getWorkoutPlanDayForDate(date);
  const displayName =
    normalizeScheduledTitle(scheduledWorkout?.title) ??
    template?.name ??
    fallbackConfig.title ??
    'Unplanned day';
  const displayFocus = fallbackConfig.focus ?? 'No focus added yet.';
  const isRest = displayName.toLowerCase().includes('rest');
  const scheduledStatus = scheduledWorkout?.status?.toLowerCase();

  let status: PlanStatus;
  if (scheduledStatus === 'completed' || scheduledStatus === 'done') {
    status = 'completed';
  } else if (scheduledStatus === 'skipped') {
    status = 'skipped';
  } else if (scheduledStatus === 'shifted') {
    status = 'shifted';
  } else if (isRest) {
    status = 'rest';
  } else if (isBefore(date, startOfDay(now))) {
    status = 'missed';
  } else {
    status = 'planned';
  }

  return {
    date,
    dateIso,
    template,
    scheduledWorkout,
    session: null,
    cycleDay: fallbackConfig,
    name: displayName,
    focus: displayFocus,
    durationMinutes: fallbackConfig.estimatedDurationMinutes ?? (isRest ? 30 : 60),
    status,
    isRest
  };
}

function normalizeScheduledTitle(title: string | null | undefined) {
  if (!title) return null;
  if (title.toLowerCase().includes('unplanned')) return null;
  return title;
}

function detectCycleShifted(days: Array<PlanDay | FitnessDeskPlanDay>) {
  return days.some((day) => {
    if (day.scheduledWorkout?.status?.toLowerCase() === 'shifted') return true;
    if (!day.scheduledWorkout || !day.template) return false;
    return day.scheduledWorkout.template_id !== null && day.scheduledWorkout.template_id !== day.template.id;
  });
}

async function upsertScheduledWorkout(
  dateIso: string,
  template: WorkoutTemplateRow | null,
  cycleDay: WorkoutPlanDayConfig,
  status: string
) {
  const client = getSupabaseClient();
  const existing = await client
    .from('scheduled_workouts')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('scheduled_date', dateIso)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const payload = {
    template_id: template?.id ?? null,
    scheduled_date: dateIso,
    status,
    title: template?.name ?? cycleDay.title,
    notes: template?.description ?? `Focus: ${cycleDay.focus}. Warm-up: ${cycleDay.warmup}`
  };

  if (existing.data) {
    const updated = await client
      .from('scheduled_workouts')
      .update(payload)
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', existing.data.id);

    if (updated.error) throw updated.error;
    return;
  }

  const inserted = await client.from('scheduled_workouts').insert({
    workspace_id: WORKSPACE_ID,
    ...payload
  });

  if (inserted.error) throw inserted.error;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
