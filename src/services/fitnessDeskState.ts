import { addDays, format, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { intakeSchedule, intakeTimingLabels, intakeTimingOrder, type IntakeTiming } from '../data/intakeSchedule';
import {
  getNextStructuredWorkoutDay,
  getTrainingCycleStart,
  getWorkoutHeroCopy,
  getWorkoutPlanDayForDate,
  type WorkoutHeroCopy,
  type WorkoutPlanDayConfig
} from '../data/workout-plan';
import { getAppNow } from '../lib/appClock';
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
  WorkoutSessionRow,
  WorkoutTemplateRow
} from '../types/database';

export type FitnessDeskSessionStatus =
  | 'ready'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'shifted'
  | 'rest'
  | 'missed';

export type FitnessDeskPlanDay = {
  id: string;
  dayNumber: number;
  name: string;
  title: string;
  fullTitle: string;
  focus: string;
  focusShort: string;
  durationMin: number;
  durationMinutes: number;
  type: 'structured' | 'recovery';
  isRest: boolean;
  date: Date;
  dateIso: string;
  dateLabel: string;
  status: FitnessDeskSessionStatus;
  cycleDay: WorkoutPlanDayConfig;
  scheduledWorkout: ScheduledWorkoutRow | null;
  template: WorkoutTemplateRow | null;
  session: WorkoutSessionRow | null;
};

export type FitnessDeskIntakeItem = {
  id: string;
  name: string;
  timingKey: IntakeTiming;
  timingLabel: string;
  status: 'taken' | 'skipped' | null;
  handled: boolean;
  item: IntakeItemRow | null;
  todayLog: IntakeLogRow | null;
};

export type FitnessDeskIntakeGroup = {
  timingKey: IntakeTiming;
  timingLabel: string;
  items: FitnessDeskIntakeItem[];
};

export type FitnessDeskIntakeSummary = {
  planned: number;
  taken: number;
  skipped: number;
  handled: number;
};

export type FitnessDeskBodySummary = {
  dailyWeightKg: number | null;
  latestDailyCheckinDate: string | null;
  latestMetrics: {
    weight: number | null;
    bodyFat: number | null;
    bodyWater: number | null;
    muscleMass: number | null;
  };
  weeklyMetricKeys: string[];
  latestDailyCheckin: BodyCheckinRow | null;
};

export type FitnessDeskProgressSummary = {
  workoutCompletionPercent: number;
  intakeHandledPercent: number;
  intakeTakenPercent: number;
  bodyCheckinAdherencePercent: number;
  consistencyScore: number;
  weeklySummary: string;
  monthlySummary: string;
};

export type FitnessDeskState = {
  source: 'local' | 'supabase';
  currentDate: Date;
  currentDateLabel: string;
  todayIso: string;
  currentDayNumber: number;
  currentSessionId: string;
  currentSessionStatus: FitnessDeskSessionStatus;
  weeklyPlan: FitnessDeskPlanDay[];
  currentSession: FitnessDeskPlanDay;
  nextSession: FitnessDeskPlanDay;
  intakeGroups: FitnessDeskIntakeGroup[];
  intakeSummary: FitnessDeskIntakeSummary;
  body: FitnessDeskBodySummary;
  progress: FitnessDeskProgressSummary;
  hero: WorkoutHeroCopy;
  runningSessions: RunningSessionRow[];
};

const WEEKLY_METRIC_KEYS = [
  'weight',
  'bmi',
  'body_fat',
  'muscle_mass',
  'bmr',
  'body_water',
  'body_fat_mass',
  'lean_body_mass',
  'bone_mass',
  'visceral_fat',
  'protein',
  'skeletal_muscle_mass',
  'subcutaneous_mass',
  'body_age',
  'body_type'
] as const;

export function getInitialFitnessDeskState(now = getAppNow()): FitnessDeskState {
  return buildFitnessDeskState({
    now,
    source: 'local',
    templates: [],
    scheduledWorkouts: [],
    workoutSessions: [],
    intakeItems: [],
    intakeLogs: [],
    bodyCheckins: [],
    bodyMetricDefinitions: [],
    bodyMetricValues: [],
    runningSessions: []
  });
}

export async function getFitnessDeskState(now = getAppNow()): Promise<FitnessDeskState> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return getInitialFitnessDeskState(now);
  }

  try {
    const client = getSupabaseClient();
    const weekStart = getTrainingCycleStart(now);
    const weekEnd = addDays(weekStart, 6);
    const monthStart = startOfMonth(now);
    const todayIso = format(now, 'yyyy-MM-dd');

    const [
      templateResult,
      scheduledResult,
      sessionResult,
      intakeItemsResult,
      intakeLogsResult,
      checkinsResult,
      metricDefinitionsResult,
      metricValuesResult,
      runningSessionsResult
    ] = await Promise.all([
      client.from('workout_templates').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
      client
        .from('scheduled_workouts')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date'),
      client
        .from('workout_sessions')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('session_date'),
      client.from('intake_items').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
      client
        .from('intake_logs')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('logged_at', `${format(monthStart, 'yyyy-MM-dd')}T00:00:00`)
        .lt('logged_at', `${todayIso}T23:59:59.999`)
        .order('logged_at'),
      client
        .from('body_checkins')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('checkin_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('checkin_date', todayIso)
        .order('checkin_date'),
      client.from('body_metric_definitions').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
      client.from('body_metric_values').select('*').eq('workspace_id', WORKSPACE_ID).order('created_at'),
      client.from('running_sessions').select('*').eq('workspace_id', WORKSPACE_ID).order('session_date')
    ]);

    const firstError =
      templateResult.error ||
      scheduledResult.error ||
      sessionResult.error ||
      intakeItemsResult.error ||
      intakeLogsResult.error ||
      checkinsResult.error ||
      metricDefinitionsResult.error ||
      metricValuesResult.error ||
      runningSessionsResult.error;

    if (firstError) {
      throw firstError;
    }

    return buildFitnessDeskState({
      now,
      source: 'supabase',
      templates: (templateResult.data as WorkoutTemplateRow[]) ?? [],
      scheduledWorkouts: (scheduledResult.data as ScheduledWorkoutRow[]) ?? [],
      workoutSessions: (sessionResult.data as WorkoutSessionRow[]) ?? [],
      intakeItems: (intakeItemsResult.data as IntakeItemRow[]) ?? [],
      intakeLogs: (intakeLogsResult.data as IntakeLogRow[]) ?? [],
      bodyCheckins: (checkinsResult.data as BodyCheckinRow[]) ?? [],
      bodyMetricDefinitions: (metricDefinitionsResult.data as BodyMetricDefinitionRow[]) ?? [],
      bodyMetricValues: (metricValuesResult.data as BodyMetricValueRow[]) ?? [],
      runningSessions: (runningSessionsResult.data as RunningSessionRow[]) ?? []
    });
  } catch {
    return getInitialFitnessDeskState(now);
  }
}

export function getCurrentSession(state: FitnessDeskState) {
  return state.currentSession;
}

export function getNextSession(state: FitnessDeskState) {
  return state.nextSession;
}

export function getTodayCompletion(state: FitnessDeskState) {
  const sessionComplete = state.currentSession.status === 'completed';
  const weightLogged = state.body.dailyWeightKg !== null;
  const intakeHandledRatio = state.intakeSummary.planned > 0 ? state.intakeSummary.handled / state.intakeSummary.planned : 0;
  const score = Math.round((sessionComplete ? 0.5 : 0) * 100 + intakeHandledRatio * 30 + (weightLogged ? 20 : 0));

  return {
    score,
    sessionComplete,
    weightLogged,
    intakeHandledRatio
  };
}

export function getIntakeSummary(state: FitnessDeskState) {
  return state.intakeSummary;
}

export function getWeightSummary(state: FitnessDeskState) {
  return {
    value: state.body.dailyWeightKg,
    label: state.body.dailyWeightKg === null ? 'Not logged yet' : `${state.body.dailyWeightKg} kg`,
    checkinDate: state.body.latestDailyCheckinDate
  };
}

export function getProgressSummary(state: FitnessDeskState) {
  return state.progress;
}

export function getSessionById(state: FitnessDeskState, id: string) {
  return state.weeklyPlan.find((day) => day.id === id) ?? null;
}

export function getSessionStatus(state: FitnessDeskState, id: string) {
  return getSessionById(state, id)?.status ?? null;
}

function buildFitnessDeskState(input: {
  now: Date;
  source: 'local' | 'supabase';
  templates: WorkoutTemplateRow[];
  scheduledWorkouts: ScheduledWorkoutRow[];
  workoutSessions: WorkoutSessionRow[];
  intakeItems: IntakeItemRow[];
  intakeLogs: IntakeLogRow[];
  bodyCheckins: BodyCheckinRow[];
  bodyMetricDefinitions: BodyMetricDefinitionRow[];
  bodyMetricValues: BodyMetricValueRow[];
  runningSessions: RunningSessionRow[];
}): FitnessDeskState {
  const weekStart = getTrainingCycleStart(input.now);
  const todayIso = format(input.now, 'yyyy-MM-dd');

  const weeklyPlan = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const cycleDay = getWorkoutPlanDayForDate(date);
    const dateIso = format(date, 'yyyy-MM-dd');
    const scheduledWorkout = input.scheduledWorkouts.find((row) => row.scheduled_date === dateIso) ?? null;
    const template = resolveTemplateForDay(input.templates, scheduledWorkout, cycleDay);
    const session = input.workoutSessions.find((row) => row.session_date === dateIso) ?? null;
    const meta = getPlanDayMeta(cycleDay);

    return {
      id: meta.id,
      dayNumber: cycleDay.dayNumber,
      name: meta.title,
      title: meta.title,
      fullTitle: meta.fullTitle,
      focus: meta.focus,
      focusShort: meta.focusShort,
      durationMin: meta.durationMin,
      durationMinutes: meta.durationMin,
      type: meta.type,
      isRest: meta.type === 'recovery',
      date,
      dateIso,
      dateLabel: format(date, 'EEEE, MMMM d'),
      status: resolveSessionStatus({
        date,
        today: input.now,
        dayType: meta.type,
        scheduledWorkout,
        session
      }),
      cycleDay,
      scheduledWorkout,
      template,
      session
    } satisfies FitnessDeskPlanDay;
  });

  const currentSession = weeklyPlan.find((day) => day.dateIso === todayIso) ?? weeklyPlan[0];
  const nextSession =
    weeklyPlan.find((day) => day.dayNumber > currentSession.dayNumber && day.type === 'structured') ??
    weeklyPlan.find((day) => day.type === 'structured' && day.id !== currentSession.id) ??
    currentSession;
  const intakeGroups = buildIntakeGroups(input.intakeItems, input.intakeLogs, todayIso);
  const intakeSummary = summarizeIntake(intakeGroups);
  const body = buildBodySummary(input.bodyCheckins, input.bodyMetricDefinitions, input.bodyMetricValues);
  const progress = buildProgressSummary({
    now: input.now,
    weeklyPlan,
    intakeLogs: input.intakeLogs,
    bodyCheckins: input.bodyCheckins
  });

  return {
    source: input.source,
    currentDate: input.now,
    currentDateLabel: format(input.now, 'EEEE, MMMM d'),
    todayIso,
    currentDayNumber: currentSession.dayNumber,
    currentSessionId: currentSession.id,
    currentSessionStatus: currentSession.status,
    weeklyPlan,
    currentSession,
    nextSession,
    intakeGroups,
    intakeSummary,
    body,
    progress,
    hero: getWorkoutHeroCopy(currentSession.cycleDay),
    runningSessions: input.runningSessions
  };
}

function buildIntakeGroups(items: IntakeItemRow[], logs: IntakeLogRow[], todayIso: string): FitnessDeskIntakeGroup[] {
  const todayLogs = logs.filter((log) => {
    const intakeDate = log.intake_date ?? log.logged_at.slice(0, 10);
    return intakeDate === todayIso;
  });

  return intakeTimingOrder.map((timingKey) => {
    const groupItems = intakeSchedule
      .filter((item) => item.timing === timingKey)
      .map((scheduled) => {
        const item = items.find((row) => normalizeName(row.name) === normalizeName(scheduled.name)) ?? null;
        const todayLog = item ? todayLogs.find((log) => log.intake_item_id === item.id) ?? null : null;
        return {
          id: item?.id ?? `fallback-${scheduled.id}`,
          name: scheduled.name,
          timingKey,
          timingLabel: intakeTimingLabels[timingKey],
          status: todayLog?.status === 'taken' || todayLog?.status === 'skipped' ? todayLog.status : null,
          handled: todayLog?.status === 'taken' || todayLog?.status === 'skipped',
          item,
          todayLog
        } satisfies FitnessDeskIntakeItem;
      });

    return {
      timingKey,
      timingLabel: intakeTimingLabels[timingKey],
      items: groupItems
    };
  });
}

function summarizeIntake(groups: FitnessDeskIntakeGroup[]): FitnessDeskIntakeSummary {
  const items = groups.flatMap((group) => group.items);
  const taken = items.filter((item) => item.status === 'taken').length;
  const skipped = items.filter((item) => item.status === 'skipped').length;
  return {
    planned: items.length,
    taken,
    skipped,
    handled: taken + skipped
  };
}

function buildBodySummary(
  checkins: BodyCheckinRow[],
  definitions: BodyMetricDefinitionRow[],
  values: BodyMetricValueRow[]
): FitnessDeskBodySummary {
  const latestDailyCheckin =
    [...checkins]
      .filter((checkin) => checkin.checkin_type === 'daily')
      .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0] ?? null;

  const latestDailyWeight =
    latestDailyCheckin ? getMetricValueForCheckin(latestDailyCheckin.id, 'weight', definitions, values) : null;

  return {
    dailyWeightKg: latestDailyWeight,
    latestDailyCheckinDate: latestDailyCheckin?.checkin_date ?? null,
    latestMetrics: {
      weight: getLatestMetricValue('weight', checkins, definitions, values),
      bodyFat: getLatestMetricValue('body_fat', checkins, definitions, values),
      bodyWater: getLatestMetricValue('body_water', checkins, definitions, values),
      muscleMass: getLatestMetricValue('muscle_mass', checkins, definitions, values)
    },
    weeklyMetricKeys: [...WEEKLY_METRIC_KEYS],
    latestDailyCheckin
  };
}

function buildProgressSummary(input: {
  now: Date;
  weeklyPlan: FitnessDeskPlanDay[];
  intakeLogs: IntakeLogRow[];
  bodyCheckins: BodyCheckinRow[];
}): FitnessDeskProgressSummary {
  const todayIso = format(input.now, 'yyyy-MM-dd');
  const weekStartIso = format(getTrainingCycleStart(input.now), 'yyyy-MM-dd');
  const weeklyStructuredDays = input.weeklyPlan.filter((day) => day.type === 'structured');
  const completedStructuredDays = weeklyStructuredDays.filter((day) => day.status === 'completed').length;
  const workoutCompletionPercent = Math.round((completedStructuredDays / Math.max(weeklyStructuredDays.length, 1)) * 100);

  const elapsedDays = enumerateDates(weekStartIso, todayIso);
  const weeklyLogs = input.intakeLogs.filter((log) => {
    const intakeDate = log.intake_date ?? log.logged_at.slice(0, 10);
    return intakeDate >= weekStartIso && intakeDate <= todayIso;
  });
  const plannedWeeklyIntake = elapsedDays.length * intakeSchedule.length;
  const taken = weeklyLogs.filter((log) => log.status === 'taken').length;
  const handled = weeklyLogs.filter((log) => log.status === 'taken' || log.status === 'skipped').length;
  const intakeTakenPercent = plannedWeeklyIntake > 0 ? Math.round((taken / plannedWeeklyIntake) * 100) : 0;
  const intakeHandledPercent = plannedWeeklyIntake > 0 ? Math.round((handled / plannedWeeklyIntake) * 100) : 0;

  const dailyCheckins = new Set(
    input.bodyCheckins
      .filter((checkin) => checkin.checkin_type === 'daily' && checkin.checkin_date >= weekStartIso && checkin.checkin_date <= todayIso)
      .map((checkin) => checkin.checkin_date)
  );
  const bodyCheckinAdherencePercent = elapsedDays.length > 0 ? Math.round((dailyCheckins.size / elapsedDays.length) * 100) : 0;

  const consistencyScore = Math.round(workoutCompletionPercent * 0.5 + intakeHandledPercent * 0.3 + bodyCheckinAdherencePercent * 0.2);
  const monthlyDailyCheckins = input.bodyCheckins.filter((checkin) => checkin.checkin_type === 'daily').length;

  return {
    workoutCompletionPercent,
    intakeHandledPercent,
    intakeTakenPercent,
    bodyCheckinAdherencePercent,
    consistencyScore,
    weeklySummary: `This week: workouts ${workoutCompletionPercent}%, intake handled ${intakeHandledPercent}%, body check-ins ${bodyCheckinAdherencePercent}%.`,
    monthlySummary: `This month: ${completedStructuredDays} workout days completed, ${taken} intake items taken, ${monthlyDailyCheckins} daily body check-ins recorded.`
  };
}

function resolveTemplateForDay(
  templates: WorkoutTemplateRow[],
  scheduledWorkout: ScheduledWorkoutRow | null,
  cycleDay: WorkoutPlanDayConfig
) {
  return (
    (scheduledWorkout?.template_id ? templates.find((row) => row.id === scheduledWorkout.template_id) : null) ??
    templates.find((row) => row.day_label === `Day ${cycleDay.dayNumber}`) ??
    templates.find((row) => normalizeName(row.name) === normalizeName(cycleDay.title)) ??
    null
  );
}

function resolveSessionStatus(input: {
  date: Date;
  today: Date;
  dayType: 'structured' | 'recovery';
  scheduledWorkout: ScheduledWorkoutRow | null;
  session: WorkoutSessionRow | null;
}): FitnessDeskSessionStatus {
  const scheduledStatus = input.scheduledWorkout?.status?.toLowerCase() ?? null;
  const isToday = format(input.date, 'yyyy-MM-dd') === format(input.today, 'yyyy-MM-dd');

  if (scheduledStatus === 'completed' || scheduledStatus === 'done') return 'completed';
  if (scheduledStatus === 'skipped') return 'skipped';
  if (scheduledStatus === 'shifted') return 'shifted';
  if (input.session && input.dayType === 'structured' && isToday) return 'in_progress';
  if (input.dayType === 'recovery') return 'rest';
  if (isToday) return 'ready';
  if (isBefore(input.date, startOfDay(input.today))) return 'missed';
  return 'planned';
}

function getPlanDayMeta(cycleDay: WorkoutPlanDayConfig) {
  const title = cycleDay.title;
  const focus = cycleDay.focus;
  const focusShort = focus.replace(/, /g, ' / ');
  const id = getSessionId(cycleDay.dayNumber, title);
  const fullTitle = title === 'Rest / Walking' ? title : `${title} — ${focusShort}`;
  return {
    id,
    title,
    fullTitle,
    focus,
    focusShort,
    durationMin: cycleDay.estimatedDurationMinutes,
    type: cycleDay.sessionType === 'rest' ? ('recovery' as const) : ('structured' as const)
  };
}

function getSessionId(dayNumber: number, title: string) {
  const suffixMap: Record<number, string> = {
    1: 'push',
    2: 'pull',
    3: 'legs-core-run',
    4: 'rest-walking',
    5: 'upper-shape',
    6: 'run-arms-core',
    7: 'rest-walking'
  };
  return `day-${dayNumber}-${suffixMap[dayNumber] ?? normalizeName(title).replace(/\s+/g, '-')}`;
}

function getMetricValueForCheckin(
  checkinId: string,
  key: string,
  definitions: BodyMetricDefinitionRow[],
  values: BodyMetricValueRow[]
) {
  const definition = definitions.find((item) => item.key === key);
  if (!definition) return null;
  const value = values.find((row) => row.body_checkin_id === checkinId && row.metric_definition_id === definition.id);
  return typeof value?.numeric_value === 'number' ? value.numeric_value : null;
}

function getLatestMetricValue(
  key: string,
  checkins: BodyCheckinRow[],
  definitions: BodyMetricDefinitionRow[],
  values: BodyMetricValueRow[]
) {
  const definition = definitions.find((item) => item.key === key);
  if (!definition) return null;
  const sorted = [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  for (const checkin of sorted) {
    const value = values.find((row) => row.body_checkin_id === checkin.id && row.metric_definition_id === definition.id);
    if (typeof value?.numeric_value === 'number') return value.numeric_value;
  }
  return null;
}

function enumerateDates(startIso: string, endIso: string) {
  const dates: string[] = [];
  let cursor = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  while (cursor <= end) {
    dates.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getFallbackNextStructuredDay(date: Date) {
  return getNextStructuredWorkoutDay(date);
}
