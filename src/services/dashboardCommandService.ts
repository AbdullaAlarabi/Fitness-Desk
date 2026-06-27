import {
  getFitnessDeskState,
  getIntakeSummary,
  getProgressSummary,
  getTodayCompletion,
  getWeightSummary,
  type FitnessDeskState
} from './fitnessDeskState';
import { getAppNow } from '../lib/appClock';
import { RUN_TARGET_TIME_SECONDS, formatRunTime, getRunningProgressSnapshot } from './runningServices';

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

export async function getDashboardCommandSummary(now = getAppNow()): Promise<DashboardCommandSummary> {
  const [state, running] = await Promise.all([getFitnessDeskState(now), getRunningProgressSnapshot()]);
  return buildDashboardCommandSummary(state, running);
}

export function buildDashboardCommandSummary(
  state: FitnessDeskState,
  running: Awaited<ReturnType<typeof getRunningProgressSnapshot>>
): DashboardCommandSummary {
  const weight = getWeightSummary(state);
  const intake = getIntakeSummary(state);
  const progress = getProgressSummary(state);
  const todayCompletion = getTodayCompletion(state);
  const bodyFatValue = state.body.latestMetrics.bodyFat;
  const runGapSeconds = Math.max(0, running.latestThreePointTwoKmSeconds - RUN_TARGET_TIME_SECONDS);

  return {
    commandLine: 'Train clean. Track honestly. Adjust with data.',
    todaysWorkout: state.currentSession.fullTitle,
    workoutStatus: formatStatus(state.currentSession.status),
    nextAction: state.currentSession.status === 'completed' ? 'Recovery and intake now.' : 'Start session.',
    quickStats: [
      {
        label: 'Weight trend',
        value: weight.label,
        hint: weight.value === null ? 'Log daily weight to build the average.' : 'Latest daily weight is synced across Today and Body.'
      },
      {
        label: 'Body fat trend',
        value: bodyFatValue !== null ? `${bodyFatValue}%` : 'No logs yet',
        hint: bodyFatValue !== null ? 'Weekly scan data is connected.' : 'Add weekly body scans to see the trend.'
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
    coachNoteTitle: buildCoachNoteTitle(state),
    coachNoteBody: buildCoachNoteBody(state, intake, todayCompletion)
  };
}

function buildCoachNoteTitle(state: FitnessDeskState) {
  if (state.currentSession.status === 'completed') return 'Session complete';
  if (state.progress.consistencyScore === 0) return 'Start the week';
  return 'Workout is planned';
}

function buildCoachNoteBody(
  state: FitnessDeskState,
  intake: ReturnType<typeof getIntakeSummary>,
  todayCompletion: ReturnType<typeof getTodayCompletion>
) {
  if (state.currentSession.status === 'completed') {
    return 'Session complete. Recovery and consistency matter now.';
  }

  if (todayCompletion.weightLogged || intake.handled > 0) {
    return 'The session is live. Save the sets. Finish clean.';
  }

  return 'Start the session. Save the sets. Finish clean.';
}

function formatStatus(status: FitnessDeskState['currentSessionStatus']) {
  switch (status) {
    case 'completed':
      return 'Session complete';
    case 'in_progress':
      return 'In progress';
    case 'ready':
      return 'Ready';
    case 'planned':
      return 'Planned';
    case 'rest':
      return 'Recovery';
    case 'missed':
      return 'Missed';
    default:
      return status.replace('_', ' ');
  }
}
