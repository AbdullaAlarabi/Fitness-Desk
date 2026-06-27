import { format } from 'date-fns';
import { intakeSchedule, intakeTimingLabels, intakeTimingOrder, normalizeIntakeTiming, type IntakeTiming } from '../data/intakeSchedule';
import { getWorkoutPlanDayForDate, type WorkoutPlanDayConfig } from '../data/workout-plan';
import { getAppNow } from '../lib/appClock';
import { emitDashboardRefresh } from '../lib/dashboardEvents';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getFitnessDeskState } from './fitnessDeskState';
import { buildMissingMigrationError, isMissingColumnError } from './shared';
import type {
  BodyCheckinRow,
  BodyMetricDefinitionRow,
  BodyMetricValueRow,
  IntakeItemRow,
  IntakeLogRow,
  ScheduledWorkoutRow,
  WorkoutSessionRow,
  WorkoutTemplateRow
} from '../types/database';

export type IntakeChecklistItem = IntakeItemRow & {
  todayLog: IntakeLogRow | null;
  scheduleId: string;
  timingKey: IntakeTiming;
};

export type IntakeTimingGroup = {
  timingKey: IntakeTiming;
  timing: string;
  items: IntakeChecklistItem[];
};

export type TodayWorkoutState = {
  scheduledWorkout: ScheduledWorkoutRow | null;
  template: WorkoutTemplateRow | null;
  cycleDay: WorkoutPlanDayConfig;
  sessionCompleted: boolean;
};

export type TodayBodyState = {
  checkin: BodyCheckinRow | null;
  weightDefinition: BodyMetricDefinitionRow | null;
  weightValue: BodyMetricValueRow | null;
  latestDailyWeight: number | null;
  latestDailyCheckinDate: string | null;
};

export type TodaySnapshot = {
  todayIso: string;
  greeting: string;
  intakeGroups: IntakeTimingGroup[];
  workout: TodayWorkoutState;
  nextWorkout: WorkoutPlanDayConfig | null;
  body: TodayBodyState;
  completionScore: number;
};

export async function getTodaySnapshot(now = getAppNow()): Promise<TodaySnapshot> {
  const state = await getFitnessDeskState(now);
  const intakeGroups = state.intakeGroups.map((group) => ({
    timingKey: group.timingKey,
    timing: group.timingLabel,
    items: group.items
      .map((item) => item.item ? ({
        ...item.item,
        todayLog: item.todayLog,
        scheduleId: item.id,
        timingKey: item.timingKey
      }) : null)
      .filter((item): item is IntakeChecklistItem => item !== null)
  }));
  const completionScore = Math.round(
    (state.currentSession.status === 'completed' ? 0.5 : 0) * 100 +
      (state.intakeSummary.planned > 0 ? state.intakeSummary.handled / state.intakeSummary.planned : 0) * 30 +
      (state.body.dailyWeightKg !== null ? 20 : 0)
  );

  return {
    todayIso: state.todayIso,
    greeting: getGreeting(now),
    intakeGroups,
    workout: {
      scheduledWorkout: state.currentSession.scheduledWorkout,
      template: state.currentSession.template,
      cycleDay: state.currentSession.cycleDay,
      sessionCompleted: state.currentSession.status === 'completed'
    },
    nextWorkout: state.nextSession.cycleDay,
    body: {
      checkin: state.body.latestDailyCheckin,
      weightDefinition: null,
      weightValue: null,
      latestDailyWeight: state.body.dailyWeightKg,
      latestDailyCheckinDate: state.body.latestDailyCheckinDate
    },
    completionScore
  };
}

export async function upsertIntakeStatus(intakeItemId: string, status: 'taken' | 'skipped', now = getAppNow()) {
  return upsertIntakeLog(intakeItemId, { status }, now);
}

export async function upsertIntakeLog(
  intakeItemId: string,
  input: {
    status: 'taken' | 'skipped';
    amount?: number | null;
    unit?: string | null;
    notes?: string | null;
    timeTaken?: string | null;
  },
  now = getAppNow()
) {
  if (intakeItemId.startsWith('fallback-')) {
    throw new Error('Seed the intake defaults from /seed before saving this item.');
  }

  const client = getSupabaseClient();
  const todayIso = format(now, 'yyyy-MM-dd');
  const loggedAtIso = resolveLoggedAtIso(todayIso, input.timeTaken, now);
  const lookupWithDate = await client
    .from('intake_logs')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('intake_item_id', intakeItemId)
    .eq('intake_date', todayIso)
    .maybeSingle();

  if (!lookupWithDate.error) {
    return persistIntakeLogWithStatus(lookupWithDate.data as IntakeLogRow | null, {
      intakeItemId,
      todayIso,
      loggedAtIso,
      input
    });
  }

  if (!isMissingColumnError(lookupWithDate.error, 'intake_logs.intake_date')) {
    throw lookupWithDate.error;
  }

  if (input.status === 'skipped') {
    throw buildMissingMigrationError(
      'Intake skip requires the missing Supabase columns `intake_logs.status` and `intake_logs.intake_date`. Run migrations 004 and 009 in Supabase first.'
    );
  }

  const fallbackExisting = await client
    .from('intake_logs')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('intake_item_id', intakeItemId)
    .gte('logged_at', `${todayIso}T00:00:00`)
    .lt('logged_at', `${todayIso}T23:59:59.999`)
    .order('created_at')
    .maybeSingle();

  if (fallbackExisting.error) {
    throw fallbackExisting.error;
  }

  const basePayload = {
    amount: input.amount ?? null,
    unit: input.unit ?? null,
    notes: input.notes ?? null,
    logged_at: loggedAtIso
  };

  if (fallbackExisting.data) {
    const updated = await client
      .from('intake_logs')
      .update(basePayload)
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', fallbackExisting.data.id)
      .select()
      .single();

    if (updated.error) {
      throw updated.error;
    }

    emitDashboardRefresh();
    return { ...(updated.data as IntakeLogRow), status: 'taken' } as IntakeLogRow;
  }

  const inserted = await client
    .from('intake_logs')
    .insert({
      workspace_id: WORKSPACE_ID,
      intake_item_id: intakeItemId,
      ...basePayload
    })
    .select()
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  emitDashboardRefresh();
  return { ...(inserted.data as IntakeLogRow), status: 'taken' } as IntakeLogRow;
}

function resolveLoggedAtIso(todayIso: string, timeTaken: string | null | undefined, now: Date) {
  if (!timeTaken) return now.toISOString();
  return new Date(`${todayIso}T${timeTaken}:00`).toISOString();
}

export async function saveTodayWeight(weight: number, now = getAppNow()) {
  const client = getSupabaseClient();
  const todayIso = format(now, 'yyyy-MM-dd');

  const [checkinResult, definitionResult] = await Promise.all([
    client
      .from('body_checkins')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('checkin_date', todayIso)
      .eq('checkin_type', 'daily')
      .order('created_at')
      .maybeSingle(),
    client
      .from('body_metric_definitions')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('key', 'weight')
      .maybeSingle()
  ]);

  if (checkinResult.error) throw checkinResult.error;
  if (definitionResult.error) throw definitionResult.error;

  const weightDefinition = definitionResult.data as BodyMetricDefinitionRow | null;
  if (!weightDefinition) {
    throw new Error('Weight metric definition is missing. Run the seed script first.');
  }

  let checkin = checkinResult.data as BodyCheckinRow | null;

  if (!checkin) {
    const insertedCheckin = await client
      .from('body_checkins')
      .insert({
        workspace_id: WORKSPACE_ID,
        checkin_date: todayIso,
        checkin_type: 'daily'
      })
      .select()
      .single();

    if (insertedCheckin.error) throw insertedCheckin.error;
    checkin = insertedCheckin.data as BodyCheckinRow;
  }

  const existingValue = await client
    .from('body_metric_values')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('body_checkin_id', checkin.id)
    .eq('metric_definition_id', weightDefinition.id)
    .maybeSingle();

  if (existingValue.error) throw existingValue.error;

  if (existingValue.data) {
    const updated = await client
      .from('body_metric_values')
      .update({
        numeric_value: weight
      })
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', existingValue.data.id)
      .select()
      .single();

    if (updated.error) throw updated.error;
    emitDashboardRefresh();
    return updated.data as BodyMetricValueRow;
  }

  const inserted = await client
    .from('body_metric_values')
    .insert({
      workspace_id: WORKSPACE_ID,
      body_checkin_id: checkin.id,
      metric_definition_id: weightDefinition.id,
      numeric_value: weight
    })
    .select()
    .single();

  if (inserted.error) throw inserted.error;
  emitDashboardRefresh();
  return inserted.data as BodyMetricValueRow;
}

function buildIntakeGroups(items: IntakeItemRow[], logs: IntakeLogRow[]): IntakeTimingGroup[] {
  const scheduledItems: IntakeChecklistItem[] = intakeSchedule
    .map((scheduled, index) => {
      const item = items.find((row) => row.name.toLowerCase() === scheduled.name.toLowerCase());
      const resolvedItem =
        item ??
        ({
          id: `fallback-${scheduled.id}`,
          workspace_id: WORKSPACE_ID,
          created_at: new Date(0).toISOString(),
          name: scheduled.name,
          category: scheduled.name === 'Protein' ? 'nutrition' : 'supplement',
          timing: scheduled.timing,
          frequency: scheduled.timing === 'post_workout' ? 'training_days' : 'daily',
          default_amount: null,
          default_unit: null,
          notes: scheduled.notes ?? 'Seed this intake item to enable saving.',
          is_active: true,
          position: index + 1
        } satisfies IntakeItemRow);
      const hydratedItem = {
        ...resolvedItem,
        timing: resolvedItem.timing ?? scheduled.timing,
        frequency: resolvedItem.frequency ?? (scheduled.timing === 'post_workout' ? 'training_days' : 'daily')
      } satisfies IntakeItemRow;
      const todayLog = item ? normalizeIntakeLog(logs.find((log) => log.intake_item_id === item.id) ?? null) : null;
      return {
        ...hydratedItem,
        position: index + 1,
        timing: scheduled.timing,
        scheduleId: scheduled.id,
        timingKey: scheduled.timing,
        todayLog
      } as IntakeChecklistItem;
    })
    .filter((item): item is IntakeChecklistItem => item !== null);

  return intakeTimingOrder.map((timingKey) => ({
    timingKey,
    timing: intakeTimingLabels[timingKey],
    items: scheduledItems
      .filter((item) => normalizeIntakeTiming(item.timing) === timingKey)
      .sort((a, b) => a.position - b.position)
  }));
}

async function persistIntakeLogWithStatus(
  existingLog: IntakeLogRow | null,
  input: {
    intakeItemId: string;
    todayIso: string;
    loggedAtIso: string;
    input: {
      status: 'taken' | 'skipped';
      amount?: number | null;
      unit?: string | null;
      notes?: string | null;
      timeTaken?: string | null;
    };
  }
) {
  const client = getSupabaseClient();
  const payload = {
    status: input.input.status,
    amount: input.input.amount ?? null,
    unit: input.input.unit ?? null,
    notes: input.input.notes ?? null,
    logged_at: input.loggedAtIso,
    intake_date: input.todayIso
  };

  if (existingLog) {
    const updated = await client
      .from('intake_logs')
      .update(payload)
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', existingLog.id)
      .select()
      .single();

    if (updated.error) {
      if (isMissingColumnError(updated.error, 'intake_logs.status')) {
        throw buildMissingMigrationError(
          'Intake status requires the missing Supabase columns `intake_logs.status` and `intake_logs.intake_date`. Run migrations 004 and 009 in Supabase first.'
        );
      }
      throw updated.error;
    }

    emitDashboardRefresh();
    return updated.data as IntakeLogRow;
  }

  const inserted = await client
    .from('intake_logs')
    .insert({
      workspace_id: WORKSPACE_ID,
      intake_item_id: input.intakeItemId,
      ...payload
    })
    .select()
    .single();

  if (inserted.error) {
    if (isMissingColumnError(inserted.error, 'intake_logs.status')) {
      throw buildMissingMigrationError(
        'Intake status requires the missing Supabase columns `intake_logs.status` and `intake_logs.intake_date`. Run migrations 004 and 009 in Supabase first.'
      );
    }
    throw inserted.error;
  }

  emitDashboardRefresh();
  return inserted.data as IntakeLogRow;
}

function normalizeIntakeLog(log: IntakeLogRow | null) {
  if (!log) return null;
  return {
    ...log,
    status: log.status ?? 'taken'
  } as IntakeLogRow;
}

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function findTemplateForDate(templates: WorkoutTemplateRow[], date: Date) {
  const dayLabel = `Day ${getWorkoutPlanDayForDate(date).dayNumber}`;
  return templates.find((template) => template.day_label === dayLabel) ?? null;
}
