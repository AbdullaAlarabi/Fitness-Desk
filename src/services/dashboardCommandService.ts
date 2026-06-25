import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/constants';
import { getBodyDashboardSnapshot } from './bodyDashboardService';
import { getWorkoutPlanByDayNumber } from '../data/workout-plan';
import { getProgressDashboardSummary } from './progressDashboardService';
import { RUN_TARGET_TIME_SECONDS, formatRunTime, getRunningProgressSnapshot } from './runningServices';
import { getTodaySnapshot } from './todayService';

export type DashboardQuickStat = {
  label: string;
  value: string;
  hint: string;
};

export type DashboardCommandSummary = {
  commandLine: string;
  todaysWorkout: string;
  workoutStatus: string;
  nextAction: string;
  quickStats: DashboardQuickStat[];
  coachNoteTitle: string;
  coachNoteBody: string;
};

export async function getDashboardCommandSummary(now = new Date()): Promise<DashboardCommandSummary> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return buildFallbackSummary();
  }

  try {
    const [today, body, progress, running] = await Promise.all([
      getTodaySnapshot(now),
      getBodyDashboardSnapshot('30D'),
      getProgressDashboardSummary(now),
      getRunningProgressSnapshot()
    ]);

    const weightCard = body.cards.find((card) => card.key === 'weight');
    const bodyFatCard = body.cards.find((card) => card.key === 'body_fat');
    const weeklyAverage = body.calculatedMetrics.find((metric) => metric.key === 'weekly_average_weight');
    const dailyWeightLogCount = body.series.weight.length;
    const bodyFatDelta = describeDelta(body.series.body_fat);
    const runGapSeconds = Math.max(0, running.latestThreePointTwoKmSeconds - RUN_TARGET_TIME_SECONDS);

    return {
      commandLine: 'Train clean. Track honestly. Adjust with data.',
      todaysWorkout: today.workout.cycleDay.title,
      workoutStatus: today.workout.sessionCompleted
        ? 'Session complete'
        : today.workout.cycleDay
          ? 'Ready to train'
          : 'Plan not loaded',
      nextAction: today.workout.sessionCompleted
        ? 'Recovery and intake now.'
        : today.workout.cycleDay
          ? 'Start today’s session.'
          : 'Open the next planned workout.',
      quickStats: [
        {
          label: 'Weight trend',
          value: weightCard?.value !== null && weightCard?.value !== undefined ? `${weightCard.value} kg` : 'No logs yet',
          hint:
            dailyWeightLogCount === 0
              ? 'Log daily weight to build the average.'
              : dailyWeightLogCount === 1
                ? `Latest daily weight saved. 7-day average: ${weeklyAverage?.value ?? 'Needs more logs'}.`
                : `7-day average: ${weeklyAverage?.value ?? 'Needs more logs'}.`
        },
        {
          label: 'Body fat trend',
          value: bodyFatCard?.value !== null && bodyFatCard?.value !== undefined ? `${bodyFatCard.value}%` : 'No logs yet',
          hint: bodyFatDelta ?? 'Add weekly body scans to see the trend.'
        },
        {
          label: '3.2 km progress',
          value: formatRunTime(running.bestThreePointTwoKmSeconds),
          hint: runGapSeconds > 0 ? `${Math.ceil(runGapSeconds / 60)} min from target pace.` : 'Target pace is in range.'
        },
        {
          label: 'Weekly consistency',
          value: `${progress.consistencyScore}%`,
          hint: `${progress.workoutCompletionPercent}% workouts completed this week.`
        }
      ],
      coachNoteTitle: buildCoachNoteTitle(today, progress),
      coachNoteBody: buildCoachNoteBody(today, body, progress)
    };
  } catch {
    return buildFallbackSummary();
  }
}

function buildCoachNoteTitle(today: Awaited<ReturnType<typeof getTodaySnapshot>> | null, progress?: Awaited<ReturnType<typeof getProgressDashboardSummary>> | null) {
  if (!today || !progress) return 'Log your first check-in';
  if (today.workout.sessionCompleted) return 'Session complete';
  if (progress.consistencyScore === 0) return 'Log your first check-in';
  return 'Workout is planned';
}

function buildCoachNoteBody(
  today: Awaited<ReturnType<typeof getTodaySnapshot>> | null,
  body: Awaited<ReturnType<typeof getBodyDashboardSnapshot>> | null,
  progress?: Awaited<ReturnType<typeof getProgressDashboardSummary>> | null
) {
  if (!today || !body || !progress) {
    return 'Log your first check-in to activate coaching notes.';
  }

  if (today.workout.sessionCompleted) {
    return 'Session complete. Recovery and consistency matter now.';
  }

  if (today.workout.cycleDay) {
    return 'Shift the session only if needed. Do not break the chain.';
  }

  if (body.cards.every((card) => card.value === null) && progress.consistencyScore === 0) {
    return 'Log your first check-in to activate coaching notes.';
  }

  return 'Train clean. Track honestly. Adjust with data.';
}

function buildFallbackSummary(): DashboardCommandSummary {
  const fallbackDay = getWorkoutPlanByDayNumber(1);

  return {
    commandLine: 'Train clean. Track honestly. Adjust with data.',
    todaysWorkout: fallbackDay.title,
    workoutStatus: 'Waiting for data',
    nextAction: 'Load the schedule or connect Supabase.',
    quickStats: [
      { label: 'Weight trend', value: 'No logs yet', hint: 'Log daily weight to start the average.' },
      { label: 'Body fat trend', value: 'No logs yet', hint: 'Weekly scans will populate this card.' },
      { label: '3.2 km progress', value: '20:00', hint: 'Current benchmark until runs are logged.' },
      { label: 'Weekly consistency', value: '0%', hint: 'Complete today’s actions to build the score.' }
    ],
    coachNoteTitle: 'Log your first check-in',
    coachNoteBody: 'Log your first check-in to activate coaching notes.'
  };
}

function describeDelta(series: Array<{ date: string; value: number }>) {
  if (series.length < 2) return null;
  const latest = series[series.length - 1]?.value ?? null;
  const previous = series[series.length - 2]?.value ?? null;
  if (latest === null || previous === null) return null;
  const delta = Number((latest - previous).toFixed(1));
  if (delta === 0) return 'Stable versus the last reading.';
  return `${delta > 0 ? '+' : ''}${delta}% versus the last entry.`;
}
