import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Dumbbell,
  Flame,
  Loader2,
  Play,
  Scale,
  Target,
  XCircle,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, MetricInput, SectionEyebrow } from '../components/ui';
import { getDayCoverMedia, getTodayHeroMedia } from '../data/mediaManifest';
import { buildDashboardCommandSummary } from '../services/dashboardCommandService';
import { getIntakeSummary, getTodayCompletion, type FitnessDeskIntakeItem } from '../services/fitnessDeskState';
import { getRunningProgressSnapshot } from '../services/runningServices';
import { saveTodayWeight, upsertIntakeLog } from '../services/todayService';
import { useFitnessDeskState } from '../state/fitnessDeskState';

export function TodayPage() {
  const { state, refresh } = useFitnessDeskState();
  const [runningSnapshot, setRunningSnapshot] = useState<Awaited<ReturnType<typeof getRunningProgressSnapshot>> | null>(null);
  const [error, setError] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState(state.body.dailyWeightKg?.toString() ?? '');

  useEffect(() => {
    setWeightInput(state.body.dailyWeightKg?.toString() ?? '');
  }, [state.body.dailyWeightKg]);

  useEffect(() => {
    let active = true;
    void getRunningProgressSnapshot().then((result) => {
      if (active) setRunningSnapshot(result);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleIntakeAction(
    itemId: string,
    input: {
      status: 'taken' | 'skipped';
      amount?: number | null;
      unit?: string | null;
      notes?: string | null;
      timeTaken?: string | null;
    }
  ) {
    setActingItemId(itemId);
    setError('');

    try {
      await upsertIntakeLog(itemId, input);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not save intake status.');
    } finally {
      setActingItemId(null);
    }
  }

  async function handleWeightSave() {
    const weight = Number(weightInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Enter a valid weight in kg.');
      return;
    }

    setSavingWeight(true);
    setError('');

    try {
      await saveTodayWeight(weight);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save weight.');
    } finally {
      setSavingWeight(false);
    }
  }

  const intakeGroups = state.intakeGroups.filter((group) => group.items.length > 0);
  const intakeSummary = getIntakeSummary(state);
  const todayCompletion = getTodayCompletion(state);
  const commandSummary = useMemo(
    () =>
      buildDashboardCommandSummary(
        state,
        runningSnapshot ?? {
          runs: state.runningSessions,
          bestThreePointTwoKmSeconds: 1200,
          latestThreePointTwoKmSeconds: 1200,
          targetThreePointTwoKmSeconds: 900,
          baselineThreePointTwoKmSeconds: 1200,
          currentPaceSecondsPerKm: 375,
          targetPaceSecondsPerKm: 281,
          baselineSpeedKmh: 9.6,
          targetSpeedKmh: 12.8,
          latestSpeedKmh: 9.6,
          improvementSeconds: 0,
          progressPercent: 0,
          nextTestDate: '--',
          milestones: []
        }
      ),
    [runningSnapshot, state]
  );

  const heroContent = state.hero;
  const todayCoverMedia = getDayCoverMedia(state.currentSession.dayNumber);
  const todayHeroMedia = getTodayHeroMedia(state.currentSession.cycleDay.sessionType ?? null);
  const todayWorkoutComplete = state.currentSession.status === 'completed';
  const sessionInProgress = state.currentSession.status === 'in_progress';
  const sessionExerciseCount = state.currentSession.cycleDay.exercises.length;
  const missionPrimaryLabel = todayWorkoutComplete
    ? 'Review Session'
    : sessionInProgress
      ? 'Continue Session'
      : 'Start Session';
  const missionEyebrow = `Day ${state.currentSession.dayNumber} · ${state.currentDateLabel}`;
  const score = todayCompletion.score;
  const weightValue = state.body.dailyWeightKg !== null ? `${state.body.dailyWeightKg} kg` : 'Not logged yet';
  const intakeFullyDecided = intakeSummary.handled === intakeSummary.planned;
  const nextActionMessage = getNextActionMessage({
    workoutStatus: state.currentSession.status,
    intakeHandled: intakeSummary.handled,
    intakePlanned: intakeSummary.planned,
    weightLogged: state.body.dailyWeightKg !== null
  });
  const completionRingStyle = {
    background: `conic-gradient(var(--color-accent) ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
  };
  const visibleExercises = state.currentSession.cycleDay.exercises.slice(0, 6);
  const intakeRows = intakeGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      timingLabel: group.timingLabel
    }))
  );

  return (
    <div className="space-y-6 pb-[calc(var(--mobile-page-bottom)+0.75rem)] md:pb-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-4">
          <section className="fd-panel-dark relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] overflow-hidden rounded-[inherit] lg:block">
              <img
                src={todayHeroMedia.imageUrl ?? todayCoverMedia.imageUrl}
                alt={todayHeroMedia.alt}
                className="h-full w-full object-cover opacity-20"
                style={{ objectPosition: todayHeroMedia.objectPosition ?? 'center right' }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,26,26,0.98)_0%,rgba(10,26,26,0.92)_52%,rgba(10,26,26,0.16)_100%)]" />
            </div>

            <div className="relative z-10 max-w-3xl space-y-6">
              <div className="space-y-3">
                <SectionEyebrow inverse>Today&apos;s Mission</SectionEyebrow>
                <div>
                  <p className="eyebrow-text text-white/42">{missionEyebrow}</p>
                  <h1 className="display-hero mt-4 text-white">
                    {state.currentSession.isRest ? state.currentSession.title.toUpperCase() : `${state.currentSession.title.toUpperCase()} DAY`}
                    <span className="text-gold">.</span>
                  </h1>
                  <p className="mt-4 max-w-2xl text-[18px] leading-8 text-white/70">
                    {state.currentSession.focus}. {sessionExerciseCount > 0 ? `${sessionExerciseCount} exercises` : 'Structured session'}.
                    {' '} {heroContent.command}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/52">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                  {state.currentSession.isRest ? 'Recovery' : state.currentSession.cycleDay.sessionType === 'run' ? 'Running' : 'Strength'}
                </span>
                <span>{`~${state.currentSession.durationMin} min`}</span>
                <span>{`${sessionExerciseCount || '--'} exercises`}</span>
                <span>{`Day ${state.currentSession.dayNumber} of cycle`}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/workout?date=${state.todayIso}`} className="fd-button-accent min-w-[190px] justify-center text-base">
                  {todayWorkoutComplete ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {missionPrimaryLabel}
                </Link>
                <Link to="/plan" className="inline-flex items-center gap-2 text-base font-medium text-white/60 transition hover:text-white">
                  Preview
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/62">
                {nextActionMessage}
              </div>
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            <MiniMetricCard
              label="Training"
              value={todayWorkoutComplete ? '1/1' : sessionInProgress ? 'Live' : '0/1'}
              helper={todayWorkoutComplete ? 'Session closed' : `${state.currentSession.title} pending`}
              icon={<Dumbbell className="h-4 w-4 text-gold" />}
              accent="var(--color-training)"
            />
            <MiniMetricCard
              label="Intake"
              value={`${intakeSummary.handled}/${intakeSummary.planned}`}
              helper={`${Math.max(intakeSummary.planned - intakeSummary.handled, 0)} remaining`}
              icon={<Zap className="h-4 w-4 text-[var(--color-intake)]" />}
              accent="var(--color-intake)"
            />
            <MiniMetricCard
              label="Weight"
              value={state.body.dailyWeightKg !== null ? `${state.body.dailyWeightKg}` : '--'}
              helper={state.body.dailyWeightKg !== null ? 'kg · logged today' : 'kg · not logged'}
              icon={<Scale className="h-4 w-4 text-[var(--color-body)]" />}
              accent="var(--color-body)"
            />
            <MiniMetricCard
              label="Score"
              value={`${score}%`}
              helper="Complete the day"
              icon={<Flame className="h-4 w-4 text-[var(--color-success)]" />}
              accent="var(--color-success)"
            />
          </div>

          <section className="fd-today-surface overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="fd-label">Today&apos;s Workout</p>
                <h2 className="section-title mt-3 text-white">{state.currentSession.fullTitle}</h2>
              </div>
              <Link to={`/workout?date=${state.todayIso}`} className="inline-flex items-center gap-2 text-sm font-medium text-white/58 transition hover:text-white">
                Full plan
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-white/8 px-5 py-4 text-sm text-white/52 sm:px-6">
              <span>{`~${state.currentSession.durationMin} min`}</span>
              <span>{`${sessionExerciseCount} exercises`}</span>
              <span>{state.currentSession.isRest ? 'Recovery focus' : 'Volume PR target'}</span>
            </div>

            <div className="px-5 py-2 sm:px-6">
              {visibleExercises.length > 0 ? (
                visibleExercises.map((exercise, index) => (
                  <div key={exercise.id} className="fd-exercise-row">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/30">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white">{exercise.name}</p>
                      <p className="mt-1 text-sm text-white/46">{exercise.targetMuscles}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex rounded-[8px] bg-white/8 px-3 py-1 text-[13px] font-semibold tracking-[0.02em] text-white/78">
                        {`${exercise.sets}×${exercise.minReps}${exercise.maxReps !== exercise.minReps ? `-${exercise.maxReps}` : ''}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-sm text-white/50">Exercise list will appear here when the session template is loaded.</div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="fd-today-surface overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
              <div>
                <p className="fd-label">Daily Score</p>
                <h2 className="section-title mt-3 text-white">Complete the Day</h2>
              </div>
              <div className="fd-score-ring" style={completionRingStyle}>
                <div className="fd-score-ring__inner">{`${score}%`}</div>
              </div>
            </div>

            <div className="px-5 pb-3 sm:px-6">
              <ChecklistItem
                label="Complete workout"
                value={commandSummary.workoutStatus}
                done={todayWorkoutComplete}
              />
              <ChecklistItem
                label="Log all supplements"
                value={`${intakeSummary.handled}/${intakeSummary.planned}`}
                done={intakeFullyDecided}
              />
              <ChecklistItem
                label="Record weight"
                value={weightValue}
                done={state.body.dailyWeightKg !== null}
              />
              <ChecklistItem
                label="Next workout"
                value={state.nextSession.title}
                done={false}
                icon={<Target className="h-5 w-5 text-[var(--color-intake)]" />}
              />
            </div>
          </section>

          <section className="fd-today-surface overflow-hidden">
            <div className="px-5 py-5 sm:px-6">
              <p className="fd-label">Body</p>
              <h2 className="section-title mt-3 text-white">Quick Check-In</h2>
            </div>

            <div className="border-t border-white/8 px-5 py-5 sm:px-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-end gap-2">
                  <span className="metric-value text-white">{state.body.dailyWeightKg !== null ? state.body.dailyWeightKg : '--'}</span>
                  <span className="pb-1 text-lg text-white/42">kg</span>
                </div>
                <div className="text-sm text-[var(--color-success)]">
                  {state.body.latestDailyCheckinDate ? `Latest: ${state.body.latestDailyCheckinDate}` : 'Not logged yet'}
                </div>
              </div>

              <div className="space-y-4">
                <MetricInput
                  label="Weight"
                  unit="kg"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void handleWeightSave()}
                  disabled={savingWeight}
                  className="fd-button-secondary w-full justify-between border-white/10 bg-white/[0.02] text-white disabled:opacity-60"
                >
                  <span>Update today&apos;s weight</span>
                  {savingWeight ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </section>

          <section className="fd-today-surface overflow-hidden">
            <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-6">
              <div>
                <p className="fd-label">Supplements</p>
                <h2 className="section-title mt-3 text-white">Daily Intake</h2>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-white">{`${intakeSummary.handled}/${intakeSummary.planned}`}</p>
                <div className="mt-2 h-2 w-24 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[var(--color-intake)] transition-[width] duration-200"
                    style={{ width: `${intakeSummary.planned > 0 ? (intakeSummary.handled / intakeSummary.planned) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 px-5 py-4 sm:px-6">
              <div className="space-y-3">
                {intakeRows.map((item) => (
                  <IntakeRow
                    key={item.id}
                    item={item}
                    busy={actingItemId === item.id}
                    onAction={handleIntakeAction}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="fd-today-surface px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="fd-label">Next Workout</p>
            <h2 className="section-title mt-3 text-white">{`Day ${state.nextSession.dayNumber} · ${state.nextSession.title}`}</h2>
            <p className="mt-2 text-sm text-white/54">{state.nextSession.focus}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={state.nextSession.status === 'planned' ? 'planned' : 'ready'} tone="dark">
              {formatStatusLabel(state.nextSession.status)}
            </Badge>
            <Link to="/plan" className="fd-button-secondary border-white/10 bg-transparent text-white/82">
              Open Plan
            </Link>
          </div>
        </div>
      </section>

      {error ? <ErrorBanner message={error} /> : null}
    </div>
  );
}

function MiniMetricCard({
  label,
  value,
  helper,
  icon,
  accent
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="fd-mini-metric">
      <div className="mb-4 h-[3px] w-24 rounded-full" style={{ background: accent }} />
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="eyebrow-text text-white/42">{label}</p>
      </div>
      <p className="metric-value text-white">{value}</p>
      <p className="mt-2 text-sm text-white/46">{helper}</p>
    </div>
  );
}

function ChecklistItem({
  label,
  value,
  done,
  icon
}: {
  label: string;
  value: string;
  done: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="fd-checklist-row">
      <div>
        {icon ?? (done ? <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" /> : <Circle className="h-5 w-5 text-white/36" />)}
      </div>
      <p className={done ? 'text-base font-medium text-white/48 line-through' : 'text-base font-medium text-white/88'}>{label}</p>
      <span className="text-sm text-white/38">{value}</span>
    </div>
  );
}

function IntakeRow({
  item,
  busy,
  onAction
}: {
  item: FitnessDeskIntakeItem & { timingLabel?: string };
  busy: boolean;
  onAction: (
    itemId: string,
    input: {
      status: 'taken' | 'skipped';
      amount?: number | null;
      unit?: string | null;
      notes?: string | null;
      timeTaken?: string | null;
    }
  ) => void;
}) {
  const status = item.todayLog?.status ?? 'pending';
  const isTaken = status === 'taken';
  const isSkipped = status === 'skipped';

  async function toggleStatusIcon() {
    if (status === 'taken') {
      onAction(item.id, { status: 'skipped' });
      return;
    }

    onAction(item.id, { status: 'taken' });
  }

  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="card-title text-white">{item.name}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-white/38">{item.timingLabel}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleStatusIcon()}
          aria-label={
            status === 'taken'
              ? `Change ${item.name} to skipped`
              : status === 'skipped'
                ? `Change ${item.name} to taken`
                : `Mark ${item.name} as taken`
          }
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition',
            isTaken
              ? 'border-[var(--color-success)] bg-[rgba(52,199,89,0.16)] text-[var(--color-success)]'
              : isSkipped
                ? 'border-[var(--color-warning)] bg-[rgba(255,149,0,0.16)] text-[var(--color-warning)]'
                : 'border-white/12 bg-white/4 text-white/38'
          ].join(' ')}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTaken ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : isSkipped ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item.id, { status: 'taken' })}
          className={[
            'min-h-10 rounded-full px-4 text-sm font-semibold transition',
            status === 'taken'
              ? 'bg-[var(--color-success)] text-[var(--color-base)]'
              : 'border border-white/10 bg-white/[0.03] text-white/76'
          ].join(' ')}
        >
          Taken
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item.id, { status: 'skipped' })}
          className={[
            'min-h-10 rounded-full px-4 text-sm font-semibold transition',
            status === 'skipped'
              ? 'bg-[var(--color-warning)] text-[var(--color-base)]'
              : 'border border-white/10 bg-white/[0.03] text-white/46'
          ].join(' ')}
        >
          Skipped
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,59,48,0.2)] bg-[rgba(255,59,48,0.08)] px-4 py-4 text-sm text-red-200">
      {message}
    </div>
  );
}

function formatStatusLabel(status: string) {
  if (status === 'ready') return 'Ready';
  if (status === 'completed') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  if (status === 'rest') return 'Recovery';
  return status.replace('_', ' ');
}

function getNextActionMessage({
  workoutStatus,
  intakeHandled,
  intakePlanned,
  weightLogged
}: {
  workoutStatus: string;
  intakeHandled: number;
  intakePlanned: number;
  weightLogged: boolean;
}) {
  const intakeIncomplete = intakeHandled < intakePlanned;

  if (workoutStatus === 'ready' || workoutStatus === 'in_progress') {
    return 'Start the session first. Log post-workout intake after training.';
  }

  if (workoutStatus === 'completed' && intakeIncomplete) {
    return 'Session complete. Finish post-workout intake.';
  }

  if (intakeIncomplete || !weightLogged) {
    return 'Finish intake and log today’s weight.';
  }

  return 'The day is under control. Review the next session when ready.';
}
