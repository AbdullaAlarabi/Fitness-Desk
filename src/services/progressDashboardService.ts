import { addDays, format, startOfMonth } from 'date-fns';
import { intakeSchedule } from '../data/intakeSchedule';
import { getTrainingCycleStart } from '../data/workout-plan';
import { getAppNow } from '../lib/appClock';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { BodyCheckinRow, IntakeItemRow, IntakeLogRow, ScheduledWorkoutRow, WorkoutSessionRow } from '../types/database';
import type { BodyDashboardSnapshot } from './bodyDashboardService';
import { getBodyDashboardSnapshot } from './bodyDashboardService';
import type { RunningProgressSnapshot } from './runningServices';
import { getRunningProgressSnapshot } from './runningServices';

export type ProgressWeekBar = {
  week: string;
  workouts: number;
  intake: number;
};

export type ProgressSummary = {
  consistencyScore: number;
  workoutCompletionPercent: number;
  intakeAdherencePercent: number;
  bodyCheckinAdherencePercent: number;
  weeklySummary: string;
  monthlySummary: string;
  weeklyBars: ProgressWeekBar[];
  bodySnapshot: BodyDashboardSnapshot;
  runningSnapshot: RunningProgressSnapshot;
};

export async function getProgressDashboardSummary(now = getAppNow()): Promise<ProgressSummary> {
  const client = getSupabaseClient();
  const weekStart = getTrainingCycleStart(now);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(now);
  const todayIso = format(now, 'yyyy-MM-dd');
  const weekStartIso = format(weekStart, 'yyyy-MM-dd');
  const weekEndIso = format(weekEnd, 'yyyy-MM-dd');
  const monthStartIso = format(monthStart, 'yyyy-MM-dd');

  const [scheduledResult, sessionsResult, intakeItemsResult, intakeLogsResult, checkinsResult, bodySnapshot, runningSnapshot] =
    await Promise.all([
      client
        .from('scheduled_workouts')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('scheduled_date', monthStartIso)
        .lte('scheduled_date', weekEndIso)
        .order('scheduled_date'),
      client
        .from('workout_sessions')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('session_date', monthStartIso)
        .lte('session_date', weekEndIso)
        .order('session_date'),
      client.from('intake_items').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
      client
        .from('intake_logs')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('logged_at', `${monthStartIso}T00:00:00`)
        .lt('logged_at', `${weekEndIso}T23:59:59.999`)
        .order('logged_at'),
      client
        .from('body_checkins')
        .select('*')
        .eq('workspace_id', WORKSPACE_ID)
        .gte('checkin_date', monthStartIso)
        .lte('checkin_date', todayIso)
        .order('checkin_date'),
      getBodyDashboardSnapshot('90D'),
      getRunningProgressSnapshot()
    ]);

  if (scheduledResult.error) throw scheduledResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (intakeItemsResult.error) throw intakeItemsResult.error;
  if (intakeLogsResult.error) throw intakeLogsResult.error;
  if (checkinsResult.error) throw checkinsResult.error;

  const scheduled = (scheduledResult.data as ScheduledWorkoutRow[]) ?? [];
  const sessions = (sessionsResult.data as WorkoutSessionRow[]) ?? [];
  const intakeItems = (intakeItemsResult.data as IntakeItemRow[]) ?? [];
  const intakeLogs = (intakeLogsResult.data as IntakeLogRow[]) ?? [];
  const checkins = (checkinsResult.data as BodyCheckinRow[]) ?? [];

  const workoutCompletionPercent = calculateWorkoutCompletionPercent(scheduled, sessions, weekStartIso, weekEndIso);
  const intakeAdherencePercent = calculateIntakeAdherencePercent(intakeItems, intakeLogs, weekStartIso, weekEndIso);
  const bodyCheckinAdherencePercent = calculateBodyCheckinAdherencePercent(checkins, weekStartIso, todayIso);
  const consistencyScore = Math.round(workoutCompletionPercent * 0.5 + intakeAdherencePercent * 0.3 + bodyCheckinAdherencePercent * 0.2);

  return {
    consistencyScore,
    workoutCompletionPercent,
    intakeAdherencePercent,
    bodyCheckinAdherencePercent,
    weeklySummary: buildWeeklySummary(workoutCompletionPercent, intakeAdherencePercent, bodyCheckinAdherencePercent),
    monthlySummary: buildMonthlySummary(scheduled, sessions, intakeLogs, checkins, monthStartIso, todayIso),
    weeklyBars: buildWeeklyBars(scheduled, sessions, intakeItems, intakeLogs, monthStart),
    bodySnapshot,
    runningSnapshot
  };
}

function calculateWorkoutCompletionPercent(
  scheduled: ScheduledWorkoutRow[],
  sessions: WorkoutSessionRow[],
  weekStartIso: string,
  weekEndIso: string
) {
  const weeklyScheduled = scheduled.filter((item) => item.scheduled_date >= weekStartIso && item.scheduled_date <= weekEndIso);
  const structuredDays = weeklyScheduled.filter((item) => !item.title.toLowerCase().includes('rest'));
  const completedCount = structuredDays.filter(
    (item) =>
      ['completed', 'done'].includes(item.status.toLowerCase()) ||
      sessions.some((session) => session.session_date === item.scheduled_date)
  ).length;

  const fallbackTarget = 5;
  const target = structuredDays.length || fallbackTarget;
  return Math.round((completedCount / target) * 100);
}

function calculateIntakeAdherencePercent(
  intakeItems: IntakeItemRow[],
  intakeLogs: IntakeLogRow[],
  weekStartIso: string,
  weekEndIso: string
) {
  const activeItems = intakeItems.length || intakeSchedule.length;
  if (activeItems === 0) return 0;

  const daysInRange = enumerateDates(weekStartIso, weekEndIso);
  const target = activeItems * daysInRange.length;
  const takenCount = intakeLogs.filter((log) => {
    const day = log.logged_at.slice(0, 10);
    return day >= weekStartIso && day <= weekEndIso && log.status === 'taken';
  }).length;

  return Math.round((takenCount / target) * 100);
}

function calculateBodyCheckinAdherencePercent(checkins: BodyCheckinRow[], weekStartIso: string, todayIso: string) {
  const days = enumerateDates(weekStartIso, todayIso);
  const dailyCheckins = new Set(
    checkins.filter((checkin) => checkin.checkin_type === 'daily').map((checkin) => checkin.checkin_date)
  );
  return Math.round((days.filter((day) => dailyCheckins.has(day)).length / days.length) * 100);
}

function buildWeeklyBars(
  scheduled: ScheduledWorkoutRow[],
  sessions: WorkoutSessionRow[],
  intakeItems: IntakeItemRow[],
  intakeLogs: IntakeLogRow[],
  monthStart: Date
) {
  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = addDays(getTrainingCycleStart(monthStart), index * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekStartIso = format(weekStart, 'yyyy-MM-dd');
    const weekEndIso = format(weekEnd, 'yyyy-MM-dd');

    return {
      week: `W${index + 1}`,
      workouts: calculateWorkoutCompletionPercent(scheduled, sessions, weekStartIso, weekEndIso),
      intake: calculateIntakeAdherencePercent(intakeItems, intakeLogs, weekStartIso, weekEndIso)
    };
  });
}

function buildWeeklySummary(workouts: number, intake: number, body: number) {
  return `This week: workouts ${workouts}%, intake ${intake}%, body check-ins ${body}%.`;
}

function buildMonthlySummary(
  scheduled: ScheduledWorkoutRow[],
  sessions: WorkoutSessionRow[],
  intakeLogs: IntakeLogRow[],
  checkins: BodyCheckinRow[],
  monthStartIso: string,
  todayIso: string
) {
  const monthlyWorkouts = scheduled.filter((item) => item.scheduled_date >= monthStartIso && item.scheduled_date <= todayIso);
  const completedWorkouts = monthlyWorkouts.filter(
    (item) =>
      ['completed', 'done'].includes(item.status.toLowerCase()) ||
      sessions.some((session) => session.session_date === item.scheduled_date)
  ).length;
  const takenIntake = intakeLogs.filter((log) => log.status === 'taken').length;
  const dailyCheckins = checkins.filter((checkin) => checkin.checkin_type === 'daily').length;

  return `This month: ${completedWorkouts} workout days completed, ${takenIntake} intake logs saved, ${dailyCheckins} daily body check-ins recorded.`;
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
