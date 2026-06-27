import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Dumbbell, Loader2, Moon, Play, Sun, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActionRow, Badge, Card, MetricInput, MissionCard, SectionCard, StatusTile } from '../components/ui';
import { getDayCoverMedia, getTodayHeroMedia } from '../data/mediaManifest';
import { buildDashboardCommandSummary } from '../services/dashboardCommandService';
import { saveTodayWeight, upsertIntakeLog } from '../services/todayService';
import { getRunningProgressSnapshot } from '../services/runningServices';
import { getIntakeSummary, getTodayCompletion, type FitnessDeskIntakeItem } from '../services/fitnessDeskState';
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
  const score = todayCompletion.score;
  const intakeFullyDecided = intakeSummary.handled === intakeSummary.planned;
  const heroContent = state.hero;
  const todayCoverMedia = getDayCoverMedia(state.currentSession.dayNumber);
  const todayHeroMedia = getTodayHeroMedia(state.currentSession.cycleDay.sessionType ?? null);
  const todayWorkoutComplete = state.currentSession.status === 'completed';
  const sessionInProgress = state.currentSession.status === 'in_progress';
  const sessionExerciseCount = state.currentSession.cycleDay.exercises.length;
  const missionEyebrow = `Day ${state.currentSession.dayNumber} · ${state.currentDateLabel}`;
  const missionPrimaryLabel = todayWorkoutComplete
    ? 'Review Session'
    : sessionInProgress
      ? 'Continue Session'
      : 'Start Session';
  const weightValue = state.body.dailyWeightKg !== null ? `${state.body.dailyWeightKg} kg` : 'Not logged yet';
  const nextActionMessage = getNextActionMessage({
    workoutStatus: state.currentSession.status,
    intakeHandled: intakeSummary.handled,
    intakePlanned: intakeSummary.planned,
    weightLogged: state.body.dailyWeightKg !== null
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_340px]">
        <div className="space-y-4">
          <MissionCard
            eyebrow={missionEyebrow}
            title={state.currentSession.title}
            subtitle={state.currentSession.focusShort}
            description={heroContent.command}
            status={commandSummary.workoutStatus}
            image={{
              src: todayHeroMedia.imageUrl ?? todayCoverMedia.imageUrl,
              alt: todayHeroMedia.alt,
              objectPosition: todayHeroMedia.objectPosition
            }}
            metadata={[
              { label: 'Duration', value: `${state.currentSession.durationMin} min` },
              { label: 'Type', value: state.currentSession.isRest ? 'Recovery day' : 'Structured day' },
              { label: 'Exercises', value: sessionExerciseCount > 0 ? `${sessionExerciseCount}` : '--' }
            ]}
            primaryAction={
              <Link to={`/workout?date=${state.todayIso}`} className="fd-button-accent min-w-[176px]">
                {todayWorkoutComplete ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {missionPrimaryLabel}
              </Link>
            }
            secondaryAction={
              <Link to="/plan" className="fd-button-secondary min-w-[136px]">
                View Plan
              </Link>
            }
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusTile
              label="Training"
              value={commandSummary.workoutStatus}
              accent={state.currentSession.status === 'ready' || state.currentSession.status === 'in_progress'}
            />
            <StatusTile label="Intake" value={`${intakeSummary.handled}/${intakeSummary.planned} handled`} />
            <StatusTile label="Weight" value={weightValue} />
          </div>

          <Card className="space-y-2">
            <p className="fd-label">Next action</p>
            <p className="card-title text-teal">{nextActionMessage}</p>
          </Card>

          <SectionCard
            title="Today’s Workout"
            eyebrow="Start session"
            action={
              <Link to={`/workout?date=${state.todayIso}`} className="fd-button-accent">
                {todayWorkoutComplete ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {missionPrimaryLabel}
              </Link>
            }
          >
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="card-title text-teal">{heroContent.title}</p>
                  <p className="body-copy mt-2 text-muted">{state.currentSession.focus}</p>
                  <p className="helper-text mt-3 text-teal">{state.currentSession.durationMin} minutes</p>
                </div>
                <Badge variant={todayWorkoutComplete ? 'completed' : sessionInProgress ? 'in_progress' : 'ready'}>
                  {commandSummary.workoutStatus}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusTile label="Focus" value={state.currentSession.focusShort} />
                <StatusTile label="Type" value={state.currentSession.isRest ? 'Recovery' : 'Structured'} />
                <StatusTile label="Exercises" value={sessionExerciseCount > 0 ? `${sessionExerciseCount}` : '--'} />
              </div>
            </Card>
          </SectionCard>

          <SectionCard title="Next Workout" eyebrow="Next workout">
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="fd-label">{`Day ${state.nextSession.dayNumber}`}</p>
                  <p className="section-title mt-2 text-teal">{state.nextSession.title}</p>
                  <p className="body-copy mt-2 text-muted">{state.nextSession.focus}</p>
                </div>
                <Badge variant={state.nextSession.status === 'planned' ? 'planned' : 'ready'}>
                  {formatStatusLabel(state.nextSession.status)}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusTile label="Duration" value={`${state.nextSession.durationMin} min`} />
                <StatusTile label="Type" value={state.nextSession.isRest ? 'Recovery' : 'Structured'} />
                <StatusTile label="Date" value={state.nextSession.dateLabel} />
              </div>
            </Card>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Complete the Day" eyebrow={getGreeting(state.currentDate)}>
            <div className="grid gap-3">
              <ChecklistRow
                label="Training"
                value={todayWorkoutComplete ? 'Completed' : commandSummary.workoutStatus}
                done={todayWorkoutComplete}
              />
              <ChecklistRow
                label="Intake"
                value={`${intakeSummary.handled}/${intakeSummary.planned} handled`}
                done={intakeFullyDecided}
              />
              <ChecklistRow label="Weight" value={weightValue} done={state.body.dailyWeightKg !== null} />
              <ChecklistRow label="Completion score" value={`${score}%`} done={score === 100} />
            </div>
          </SectionCard>

          <SectionCard title="Quick Body Check-In" eyebrow="Today’s weight">
            <Card className="space-y-4">
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
                  className="fd-button-accent w-full justify-center disabled:opacity-60"
                >
                  {savingWeight ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save
                </button>
              </div>
              <StatusTile label="Latest value" value={weightValue} />
            </Card>
          </SectionCard>
        </div>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Today’s Intake" eyebrow="One-tap checklist">
          <div className="space-y-5">
            {intakeGroups.map((group) => (
              <div key={group.timingKey}>
                  <div className="mb-3 flex items-center gap-2">
                    <TimingIcon timing={group.timingKey} />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{group.timingLabel}</h3>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <IntakeRow
                        key={item.id}
                        item={item}
                        busy={actingItemId === item.id}
                        onAction={handleIntakeAction}
                      />
                    ))}
                  </div>
                </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <Card className="space-y-4">
            <p className="fd-label">Today’s Session</p>
            <p className="card-title text-teal">{state.currentSession.fullTitle}</p>
            <p className="helper-text text-muted">{heroContent.command}</p>
          </Card>
          <Card className="space-y-4">
            <p className="fd-label">State summary</p>
            <div className="grid gap-3">
              <StatusTile label="Training" value={commandSummary.workoutStatus} />
              <StatusTile label="Intake" value={`${intakeSummary.handled}/${intakeSummary.planned} handled`} />
              <StatusTile label="Weight" value={weightValue} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ChecklistRow({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <ActionRow
      label={label}
      detail={value}
      status={done ? <CheckCircle2 className="h-5 w-5 text-teal" /> : <Circle className="h-5 w-5 text-muted" />}
    />
  );
}

function IntakeRow({
  item,
  busy,
  onAction
}: {
  item: FitnessDeskIntakeItem;
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
    <ActionRow
      label={item.name}
      selected={isTaken}
      status={
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
            'flex h-11 w-11 items-center justify-center rounded-2xl border transition',
            isTaken
              ? 'border-teal bg-teal text-white'
              : isSkipped
                ? 'border-line bg-gold text-teal'
                : 'border-line bg-field text-muted'
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
      }
      actions={
        <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item.id, { status: 'taken' })}
          className={[
            'min-h-11 rounded-2xl px-4 text-sm font-semibold transition',
            status === 'taken' ? 'bg-teal text-white' : 'border border-line bg-field text-teal'
          ].join(' ')}
        >
          Taken
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(item.id, { status: 'skipped' })}
          className={[
            'min-h-11 rounded-2xl px-4 text-sm font-semibold transition',
            status === 'skipped' ? 'bg-gold text-teal' : 'border border-line bg-field text-muted'
          ].join(' ')}
        >
          Skipped
        </button>
        </div>
      }
    />
  );
}

function TimingIcon({ timing }: { timing: string }) {
  if (timing === 'night') return <Moon className="h-4 w-4 text-teal" />;
  if (timing === 'post_workout') return <Dumbbell className="h-4 w-4 text-teal" />;
  return <Sun className="h-4 w-4 text-teal" />;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
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

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
