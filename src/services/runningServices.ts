import { addWeeks, format } from 'date-fns';
import { emitDashboardRefresh } from '../lib/dashboardEvents';
import type { InsertRow, RunningSessionRow, UpdateRow } from '../types/database';
import { buildMissingMigrationError, isMissingColumnError } from './shared';
import { createWithWorkspace, getById, listByWorkspace, removeById, updateById } from './shared';

export const RUN_TARGET_TIME_SECONDS = 15 * 60;
export const RUN_BASELINE_TIME_SECONDS = 20 * 60;
export const RUN_TARGET_DISTANCE_KM = 3.2;

export type RunningSessionType = 'controlled_3_2km' | 'tempo' | 'interval' | 'test';

export type RunningSessionInput = {
  sessionDate: string;
  runType: RunningSessionType;
  distanceKm: number;
  durationSeconds: number;
  treadmillSpeedKmh?: number | null;
  targetPaceSecondsPerKm?: number | null;
  rpe?: number | null;
  notes?: string | null;
};

export type RunningTargetMilestone = {
  month: string;
  minSeconds: number;
  maxSeconds: number;
};

export type RunningProgressSnapshot = {
  runs: RunningSessionRow[];
  bestThreePointTwoKmSeconds: number;
  latestThreePointTwoKmSeconds: number;
  targetThreePointTwoKmSeconds: number;
  baselineThreePointTwoKmSeconds: number;
  currentPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  baselineSpeedKmh: number;
  targetSpeedKmh: number;
  latestSpeedKmh: number;
  improvementSeconds: number;
  progressPercent: number;
  nextTestDate: string;
  milestones: RunningTargetMilestone[];
};

export const runningSessionService = {
  list: () => listByWorkspace<RunningSessionRow>('running_sessions', 'session_date'),
  get: (id: string) => getById<RunningSessionRow>('running_sessions', id),
  create: (payload: InsertRow<RunningSessionRow>) =>
    createWithWorkspace<InsertRow<RunningSessionRow>>('running_sessions', payload),
  update: (id: string, payload: UpdateRow<RunningSessionRow>) =>
    updateById<RunningSessionRow>('running_sessions', id, payload),
  remove: (id: string) => removeById('running_sessions', id)
};

export async function saveRunningSession(input: RunningSessionInput) {
  const pace = durationSecondsToPace(input.distanceKm, input.durationSeconds);
  const targetPace = input.targetPaceSecondsPerKm ?? durationSecondsToPace(RUN_TARGET_DISTANCE_KM, RUN_TARGET_TIME_SECONDS);
  const payload = {
    session_date: input.sessionDate,
    run_type: mapRunTypeForStorage(input.runType),
    distance_km: input.distanceKm,
    duration_seconds: input.durationSeconds,
    pace_seconds_per_km: pace,
    target_pace_seconds_per_km: targetPace,
    treadmill_speed_kmh: input.treadmillSpeedKmh ?? null,
    interval_summary: input.runType === 'interval' ? 'Interval run' : null,
    rpe: input.rpe ?? null,
    notes: input.notes ?? null
  };
  const result = await runningSessionService.create(payload);

  if (!result.error) {
    emitDashboardRefresh();
    return result;
  }

  if (
    !isMissingColumnError(result.error, 'running_sessions.target_pace_seconds_per_km') &&
    !isMissingColumnError(result.error, 'running_sessions.treadmill_speed_kmh')
  ) {
    return result;
  }

  const fallbackResult = await runningSessionService.create({
    session_date: input.sessionDate,
    run_type: mapRunTypeForStorage(input.runType),
    distance_km: input.distanceKm,
    duration_seconds: input.durationSeconds,
    pace_seconds_per_km: pace,
    interval_summary: input.runType === 'interval' ? 'Interval run' : null,
    rpe: input.rpe ?? null,
    notes: input.notes ?? null
  });

  if (fallbackResult.error) {
    return {
      data: null,
      error: buildMissingMigrationError(
        'Run logging needs missing Supabase columns. Run migrations 005 and 008 to add `target_pace_seconds_per_km` and `treadmill_speed_kmh`.'
      )
    };
  }

  emitDashboardRefresh();
  return fallbackResult;
}

export async function getRunningProgressSnapshot(): Promise<RunningProgressSnapshot> {
  const result = await runningSessionService.list();
  if (result.error) throw result.error;

  const runs = (result.data ?? []).slice().sort((a, b) => a.session_date.localeCompare(b.session_date));
  const threePointTwoRuns = runs.filter((run) => isThreePointTwoBenchmark(run));

  const bestThreePointTwoKmSeconds =
    threePointTwoRuns
      .map((run) => run.duration_seconds)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b)[0] ?? RUN_BASELINE_TIME_SECONDS;

  const latestThreePointTwoKmSeconds =
    [...threePointTwoRuns]
      .reverse()
      .map((run) => run.duration_seconds)
      .find((value): value is number => typeof value === 'number') ?? RUN_BASELINE_TIME_SECONDS;

  const latestBenchmark =
    [...threePointTwoRuns]
      .reverse()
      .find((run) => run.run_type === 'time_trial_3_2km' || run.run_type === 'controlled_3_2km') ?? null;

  const nextTestBase = latestBenchmark ? new Date(`${latestBenchmark.session_date}T12:00:00`) : new Date();
  const nextTestDate = format(addWeeks(nextTestBase, 4), 'yyyy-MM-dd');
  const targetPaceSecondsPerKm = durationSecondsToPace(RUN_TARGET_DISTANCE_KM, RUN_TARGET_TIME_SECONDS);
  const currentPaceSecondsPerKm = durationSecondsToPace(RUN_TARGET_DISTANCE_KM, latestThreePointTwoKmSeconds);
  const baselineSpeedKmh = durationSecondsToSpeedKmh(RUN_TARGET_DISTANCE_KM, RUN_BASELINE_TIME_SECONDS);
  const targetSpeedKmh = durationSecondsToSpeedKmh(RUN_TARGET_DISTANCE_KM, RUN_TARGET_TIME_SECONDS);
  const latestSpeedKmh = durationSecondsToSpeedKmh(RUN_TARGET_DISTANCE_KM, latestThreePointTwoKmSeconds);
  const improvementSeconds = calculateRunImprovement(RUN_BASELINE_TIME_SECONDS, latestThreePointTwoKmSeconds);
  const progressPercent = calculateProgressPercentage(RUN_BASELINE_TIME_SECONDS, RUN_TARGET_TIME_SECONDS, latestThreePointTwoKmSeconds);

  return {
    runs,
    bestThreePointTwoKmSeconds,
    latestThreePointTwoKmSeconds,
    targetThreePointTwoKmSeconds: RUN_TARGET_TIME_SECONDS,
    baselineThreePointTwoKmSeconds: RUN_BASELINE_TIME_SECONDS,
    currentPaceSecondsPerKm,
    targetPaceSecondsPerKm,
    baselineSpeedKmh,
    targetSpeedKmh,
    latestSpeedKmh,
    improvementSeconds,
    progressPercent,
    nextTestDate,
    milestones: buildMilestones()
  };
}

export function durationSecondsToPace(distanceKm: number, durationSeconds: number) {
  return Math.round(durationSeconds / distanceKm);
}

export function durationSecondsToSpeedKmh(distanceKm: number, durationSeconds: number) {
  return Number(((distanceKm / durationSeconds) * 3600).toFixed(1));
}

export function calculateRunImprovement(previousSeconds: number, currentSeconds: number) {
  return previousSeconds - currentSeconds;
}

export function calculateProgressPercentage(startSeconds: number, targetSeconds: number, currentSeconds: number) {
  const totalGap = startSeconds - targetSeconds;
  if (totalGap <= 0) return 100;
  const moved = startSeconds - currentSeconds;
  return Math.max(0, Math.min(100, Math.round((moved / totalGap) * 100)));
}

export function formatRunTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatPace(totalSecondsPerKm: number) {
  const minutes = Math.floor(totalSecondsPerKm / 60);
  const seconds = totalSecondsPerKm % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function isThreePointTwoBenchmark(run: RunningSessionRow) {
  return run.distance_km === RUN_TARGET_DISTANCE_KM;
}

function mapRunTypeForStorage(runType: RunningSessionType) {
  if (runType === 'test') return 'time_trial_3_2km';
  return runType;
}

function buildMilestones(): RunningTargetMilestone[] {
  return [
    { month: 'Month 1', minSeconds: 19 * 60, maxSeconds: 19 * 60 + 30 },
    { month: 'Month 2', minSeconds: 18 * 60, maxSeconds: 18 * 60 + 30 },
    { month: 'Month 3', minSeconds: 17 * 60 + 15, maxSeconds: 17 * 60 + 45 },
    { month: 'Month 4', minSeconds: 16 * 60 + 30, maxSeconds: 17 * 60 },
    { month: 'Month 5', minSeconds: 15 * 60 + 45, maxSeconds: 16 * 60 + 15 },
    { month: 'Month 6', minSeconds: 15 * 60, maxSeconds: 15 * 60 + 30 }
  ];
}
