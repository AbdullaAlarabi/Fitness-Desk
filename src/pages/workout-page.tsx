import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  TimerReset,
  X
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, LoadingSkeleton, MediaFrame, MissionCard, SectionCard, StateCard, StatusTile } from '../components/ui';
import { markPlanDayStatusByDate } from '../services/planService';
import {
  durationSecondsToPace,
  durationSecondsToSpeedKmh,
  formatPace,
  formatRunTime,
  RUN_TARGET_DISTANCE_KM,
  RUN_TARGET_TIME_SECONDS,
  saveRunningSession,
  type RunningSessionType
} from '../services/runningServices';
import { getDayCoverMedia, getExerciseDemoPlaceholder } from '../data/mediaManifest';
import { getAppNow } from '../lib/appClock';
import { assetUrl } from '../lib/assets';
import {
  completeWorkoutSession,
  ensureWorkoutSession,
  getProgressionSuggestion,
  getWorkoutModeSnapshot,
  saveWorkoutSet,
  type WorkoutExerciseStep,
  type WorkoutModeSnapshot
} from '../services/workoutSessionMode';
import { useFitnessDeskState } from '../state/fitnessDeskState';

export function WorkoutPage() {
  const { state, refresh } = useFitnessDeskState();
  const [searchParams] = useSearchParams();
  const dateIso = searchParams.get('date') ?? state.todayIso;
  const [snapshot, setSnapshot] = useState<WorkoutModeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [setSaving, setSetSaving] = useState(false);
  const [finishSaving, setFinishSaving] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [restRemaining, setRestRemaining] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCoachNotes, setShowCoachNotes] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [demoImageFailed, setDemoImageFailed] = useState(false);
  const [modalReturnFocusEl, setModalReturnFocusEl] = useState<HTMLElement | null>(null);
  const [runType, setRunType] = useState<RunningSessionType>('controlled_3_2km');
  const [distanceInput, setDistanceInput] = useState(RUN_TARGET_DISTANCE_KM.toString());
  const [durationInput, setDurationInput] = useState('1200');
  const [treadmillSpeedInput, setTreadmillSpeedInput] = useState('');
  const [runSaving, setRunSaving] = useState(false);

  useEffect(() => {
    void loadSnapshot();
  }, [dateIso]);

  useEffect(() => {
    if (!restActive || restRemaining <= 0) {
      if (restRemaining <= 0) setRestActive(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setRestRemaining((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [restActive, restRemaining]);

  const currentExercise = snapshot?.exercises[exerciseIndex] ?? null;
  const completedSets = currentExercise ? getLoggedSetCount(currentExercise) : 0;
  const currentSetNumber = currentExercise ? Math.min(completedSets + 1, currentExercise.setCount) : 1;
  const workoutComplete = Boolean(
    snapshot?.session &&
      snapshot.sessionType === 'gym' &&
      snapshot.exercises.length > 0 &&
      snapshot.exercises.every((exercise) => getLoggedSetCount(exercise) >= exercise.setCount)
  );
  const totalSets = snapshot?.exercises.reduce((sum, exercise) => sum + exercise.setCount, 0) ?? 0;
  const completedSetCount = snapshot?.exercises.reduce((sum, exercise) => sum + getLoggedSetCount(exercise), 0) ?? 0;
  const dayMedia = getDayCoverMedia(snapshot?.planConfig?.dayNumber ?? 1);
  const isActiveGymWorkout = Boolean(snapshot?.session && snapshot.sessionType === 'gym' && !workoutComplete);
  const requiresWeight = currentExercise ? !isBodyweightExercise(currentExercise) : true;
  const weightValue = Number(weightInput);
  const repsValue = Number(repsInput);
  const canSaveSet = Boolean(
    currentExercise &&
      Number.isFinite(repsValue) &&
      repsValue > 0 &&
      (requiresWeight ? Number.isFinite(weightValue) && weightValue >= 0 : true)
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isActiveGymWorkout) {
      document.body.classList.add('fd-workout-active-mobile');
      return () => document.body.classList.remove('fd-workout-active-mobile');
    }

    document.body.classList.remove('fd-workout-active-mobile');
    return undefined;
  }, [isActiveGymWorkout]);

  useEffect(() => {
    setDemoImageFailed(false);
  }, [currentExercise?.key, showDemo]);

  async function loadSnapshot(preferredExerciseIndex?: number) {
    setLoading(true);
    setError('');
    try {
      const next = await getWorkoutModeSnapshot(dateIso);
      setSnapshot(next);
      setSessionNotes(next.session?.notes ?? '');
      if (typeof preferredExerciseIndex === 'number') {
        setExerciseIndex(Math.min(preferredExerciseIndex, Math.max(next.exercises.length - 1, 0)));
      } else {
        setExerciseIndex(findResumeExerciseIndex(next.exercises));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load workout mode.');
    } finally {
      setLoading(false);
    }
  }

  async function startWorkout() {
    setSessionLoading(true);
    setError('');
    setSuccess('');
    try {
      await ensureWorkoutSession(dateIso);
      await loadSnapshot(exerciseIndex);
      await refresh();
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not start the workout.');
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSaveSet() {
    if (!snapshot?.session || !currentExercise) return;
    const weight = weightInput.trim() === '' ? null : Number(weightInput);
    const reps = Number(repsInput);

    if (requiresWeight && (!Number.isFinite(weight) || (weight ?? 0) < 0)) {
      setError('Enter a valid weight in kg.');
      return;
    }

    if (!Number.isFinite(reps) || reps <= 0) {
      setError('Enter reps before saving the set.');
      return;
    }

    setSetSaving(true);
    setError('');
    setSuccess('');

    try {
      await saveWorkoutSet({
        dateIso,
        sessionId: snapshot.session.id,
        exercise: currentExercise,
        setNumber: currentSetNumber,
        reps,
        weightKg: requiresWeight ? weight : weight ?? null,
        notes: null,
        restSeconds: currentExercise.restSeconds
      });
      setWeightInput('');
      setRepsInput('');
      setRestRemaining(currentExercise.restSeconds);
      setRestActive(true);
      setSuccess('Set saved. Rest started.');
      await loadSnapshot();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the set.');
    } finally {
      setSetSaving(false);
    }
  }

  async function handleFinishWorkout() {
    if (!snapshot?.session) return;
    setFinishSaving(true);
    setError('');
    setSuccess('');

    try {
      await completeWorkoutSession({
        sessionId: snapshot.session.id,
        scheduledWorkoutId: snapshot.scheduledWorkout?.id ?? null,
        durationMinutes: calculateSessionDurationMinutes(snapshot.session.duration_minutes, snapshot.session.created_at),
        notes: sessionNotes || null
      });
      setSuccess('Workout complete.');
      await loadSnapshot();
      await refresh();
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : 'Could not finish the workout.');
    } finally {
      setFinishSaving(false);
    }
  }

  async function handleSaveRun() {
    if (!snapshot?.session) return;
    const distance = Number(distanceInput);
    const duration = Number(durationInput);
    const treadmillSpeed = treadmillSpeedInput.trim() ? Number(treadmillSpeedInput) : null;

    if (!Number.isFinite(distance) || distance <= 0) {
      setError('Distance must be a valid number in km.');
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Duration must be a valid number in seconds.');
      return;
    }

    if (treadmillSpeed !== null && !Number.isFinite(treadmillSpeed)) {
      setError('Treadmill speed must be a valid number in km/h.');
      return;
    }

    setRunSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await saveRunningSession({
        sessionDate: dateIso,
        runType,
        distanceKm: distance,
        durationSeconds: duration,
        treadmillSpeedKmh: treadmillSpeed,
        notes: sessionNotes || null
      });
      if (result.error) throw result.error;
      await completeWorkoutSession({
        sessionId: snapshot.session.id,
        scheduledWorkoutId: snapshot.scheduledWorkout?.id ?? null,
        durationMinutes: calculateSessionDurationMinutes(snapshot.session.duration_minutes, snapshot.session.created_at),
        notes: sessionNotes || null
      });
      setSuccess('Run saved.');
      await loadSnapshot();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the run.');
    } finally {
      setRunSaving(false);
    }
  }

  async function handleMarkWalkComplete() {
    setFinishSaving(true);
    setError('');
    setSuccess('');
    try {
      await markPlanDayStatusByDate(dateIso, 'completed');
      setSuccess('Walk marked complete.');
      await loadSnapshot();
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not complete the walk.');
    } finally {
      setFinishSaving(false);
    }
  }

  function handleNextSet() {
    setRestActive(false);
    setRestRemaining(0);
    setSuccess('');
  }

  function handleNextExercise() {
    if (!snapshot) return;
    const nextIndex = findNextIncompleteExerciseIndex(snapshot.exercises, exerciseIndex + 1);
    setRestActive(false);
    setRestRemaining(0);
    setSuccess('');
    setExerciseIndex(nextIndex);
    setShowCoachNotes(false);
    setShowDemo(false);
  }

  function handleJumpToExercise(targetIndex: number) {
    if (!snapshot) return;
    if (targetIndex === exerciseIndex) {
      setShowFullPlan(false);
      return;
    }

    const current = snapshot.exercises[exerciseIndex];
    const currentIncomplete = current ? getLoggedSetCount(current) < current.setCount : false;

    if (currentIncomplete) {
      const confirmed = window.confirm('This exercise still has unfinished sets. Jump anyway?');
      if (!confirmed) return;
    }

    setExerciseIndex(targetIndex);
    setShowFullPlan(false);
    setShowCoachNotes(false);
    setShowDemo(false);
    setRestActive(false);
    setRestRemaining(0);
    setSuccess('');
  }

  function rememberTriggerAnd(openAction: () => void) {
    const active = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setModalReturnFocusEl(active);
    openAction();
  }

  return (
    <div className="space-y-6 pb-[calc(var(--mobile-page-bottom)+0.75rem)] md:pb-10">
      {isActiveGymWorkout ? (
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,34,34,0.98)] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {snapshot?.planConfig?.title ?? snapshot?.scheduledWorkout?.title ?? 'Workout'}
              </p>
              <p className="mt-1 text-xs font-medium text-white/48">
                Exercise {exerciseIndex + 1}/{snapshot?.exercises.length ?? 0} · {completedSetCount}/{totalSets} sets
              </p>
            </div>
          </div>
        </div>
      ) : (
        <SectionCard
          title="Train"
          eyebrow={format(new Date(`${dateIso}T12:00:00`), 'EEEE, MMMM d')}
          tone="dark"
          action={
            dateIso !== state.todayIso ? (
              <Link to="/plan" className="fd-button-secondary min-h-10 border-white/10 bg-transparent px-4 text-white/82">
                <ArrowLeft className="h-4 w-4" />
                Back to Plan
              </Link>
            ) : null
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMeta label="Session" value={snapshot?.planConfig?.title ?? snapshot?.scheduledWorkout?.title ?? 'Session'} />
            <MiniMeta
              label="Current session"
              value={`Day ${snapshot?.planConfig?.dayNumber ?? state.currentSession.dayNumber}`}
            />
            <MiniMeta
              label="Status"
              value={formatWorkoutStatus(snapshot?.scheduledWorkout?.status ?? state.currentSession.status)}
            />
          </div>
        </SectionCard>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}
      {loading && !snapshot ? <LoadingSkeleton lines={4} /> : null}

      {snapshot?.sessionType === 'rest' ? (
        <SectionCard title="Rest / Walking" eyebrow="Recovery day" tone="dark">
          <div className="space-y-4 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <div className="space-y-2 text-sm text-white/72">
              <p>Walk 30-45 minutes</p>
              <p>Easy pace</p>
              <p>No hard running</p>
              <p>No leg workout</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkWalkComplete()}
              disabled={finishSaving}
              className="fd-button-accent px-5 disabled:opacity-60"
            >
              {finishSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark Walk Complete
            </button>
          </div>
        </SectionCard>
      ) : null}

      {snapshot && snapshot.sessionType === 'gym' && !snapshot.session ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_320px]">
          <div className="space-y-5">
            <MissionCard
              eyebrow="Ready to train"
              title={snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title ?? 'Workout'}
              subtitle={snapshot.planConfig?.focus ?? 'Structured day'}
              description={getStartDescription(snapshot.planConfig?.title ?? null)}
              metadata={[
                { label: 'Duration', value: `${snapshot.planConfig?.estimatedDurationMinutes ?? 60} min` },
                { label: 'Type', value: 'Structured day' },
                { label: 'Exercises', value: `${snapshot.exercises.length}` }
              ]}
              image={{ src: dayMedia.imageUrl, alt: dayMedia.alt, objectPosition: dayMedia.objectPosition }}
              primaryAction={
                <button
                  type="button"
                  onClick={() => void startWorkout()}
                  disabled={sessionLoading}
                  className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 disabled:opacity-60 sm:w-auto"
                >
                  {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Start Session
                </button>
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={() => setShowFullPlan(true)}
                  className="fd-button-secondary min-h-12 w-full justify-center gap-2 px-5 sm:w-auto"
                >
                  View Exercise List
                </button>
              }
            />

            <SectionCard title="Exercise preview" eyebrow="In order" tone="dark">
              <div className="space-y-3">
                {snapshot.exercises.map((exercise, index) => (
                  <Card key={exercise.key} className="space-y-3" tone="dark">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <MediaFrame
                          src={resolveExerciseImageUrl(exercise.mediaThumbnailUrl)}
                          alt={exercise.mediaAlt}
                          wrapperClassName="h-16 w-16 shrink-0 rounded-2xl"
                          imageClassName="h-full w-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="fd-label">{`Exercise ${index + 1}`}</p>
                          <p className="card-title mt-2 text-white">{exercise.exerciseName}</p>
                          <p className="helper-text mt-2 text-white/46">
                            {exercise.targetMuscles ?? exercise.exerciseGroup ?? 'Target muscles set in workout plan'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="card-title text-white">
                          {exercise.setCount} × {formatRepRange(exercise.repRangeMin, exercise.repRangeMax)}
                        </p>
                        <p className="helper-text mt-2 text-white/42">Rest {exercise.restSeconds}s</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExerciseIndex(index);
                          rememberTriggerAnd(() => setShowDemo(true));
                        }}
                        aria-label={`Open demo for ${exercise.exerciseName}`}
                        data-testid={`exercise-demo-button-${exercise.key}`}
                        className="fd-button-secondary min-h-10 border-white/10 bg-transparent px-3 text-xs text-white/82 sm:px-4 sm:text-sm"
                      >
                        Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExerciseIndex(index);
                          rememberTriggerAnd(() => setShowCoachNotes(true));
                        }}
                        aria-label={`Open details for ${exercise.exerciseName}`}
                        className="fd-button-secondary min-h-10 border-white/10 bg-transparent px-3 text-xs text-white/82 sm:px-4 sm:text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Session checklist" eyebrow="Preparation" tone="dark">
              <div className="grid gap-3">
                <StatusTile label="Equipment" value="Machines / gym-based" />
                <StatusTile label="Sets" value={`${totalSets} total sets`} />
                <StatusTile label="Target" value="Controlled reps" helper="Leave 1-2 reps in reserve." />
                <StatusTile label="Post-workout" value="Protein + Creatine" />
              </div>
            </SectionCard>

            <SectionCard title="Today context" eyebrow="Before you start" tone="dark">
              <div className="grid gap-3">
                <StatusTile label="Training" value={formatWorkoutStatus(snapshot.scheduledWorkout?.status ?? state.currentSession.status)} />
                <StatusTile label="Intake" value={`${getIntakeHandledCount(state.intakeGroups)}/${getIntakePlannedCount(state.intakeGroups)} handled`} />
                <StatusTile label="Weight" value={state.body.dailyWeightKg !== null ? `${state.body.dailyWeightKg} kg` : 'Not logged yet'} />
              </div>
            </SectionCard>
          </div>
        </section>
      ) : null}

      {snapshot && snapshot.sessionType === 'run' && !snapshot.session ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_320px]">
          <MissionCard
            eyebrow="Ready to train"
            title={snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title ?? 'Run session'}
            subtitle={snapshot.planConfig?.focus}
            description={getStartDescription(snapshot.planConfig?.title ?? null)}
            metadata={[
              { label: 'Duration', value: `${snapshot.planConfig?.estimatedDurationMinutes ?? 60} min` },
              { label: 'Type', value: 'Run day' }
            ]}
            image={{ src: dayMedia.imageUrl, alt: dayMedia.alt, objectPosition: dayMedia.objectPosition }}
            primaryAction={
              <button
                type="button"
                onClick={() => void startWorkout()}
                disabled={sessionLoading}
                className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 disabled:opacity-60 sm:w-auto"
              >
                {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Session
              </button>
            }
          />
          <SectionCard title="Session checklist" eyebrow="Preparation" tone="dark">
            <div className="grid gap-3">
              <StatusTile label="Run type" value="Controlled pacing" />
              <StatusTile label="Target" value="Finish clean" helper="Track pace and effort." />
              <StatusTile label="Post-workout" value="Protein + Creatine" />
            </div>
          </SectionCard>
        </section>
      ) : null}

      {snapshot && snapshot.sessionType === 'run' && snapshot.session ? (
        <SectionCard title="Run logger" eyebrow={snapshot.planConfig?.title ?? 'Run session'} tone="dark">
          <div className="space-y-5 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/78">
              Clean reps · 1-2 reps in reserve · follow rest timer
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputBlock label="Run type">
                <select
                  value={runType}
                  onChange={(event) => setRunType(event.target.value as RunningSessionType)}
                  className="fd-input"
                >
                  <option value="interval">Interval run</option>
                  <option value="tempo">Tempo run</option>
                  <option value="controlled_3_2km">Controlled 3.2 km run</option>
                  <option value="test">3.2 km test</option>
                </select>
              </InputBlock>
              <InputBlock label="Distance km">
                <input type="number" min="0" step="0.1" value={distanceInput} onChange={(event) => setDistanceInput(event.target.value)} className="fd-input" />
              </InputBlock>
              <InputBlock label="Duration seconds">
                <input type="number" min="0" step="1" value={durationInput} onChange={(event) => setDurationInput(event.target.value)} className="fd-input" />
              </InputBlock>
              <InputBlock label="Treadmill speed km/h">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={treadmillSpeedInput}
                  onChange={(event) => setTreadmillSpeedInput(event.target.value)}
                  className="fd-input"
                />
              </InputBlock>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMeta label="Target pace" value={formatPace(durationSecondsToPace(RUN_TARGET_DISTANCE_KM, RUN_TARGET_TIME_SECONDS))} />
              <MiniMeta
                label="Current speed"
                value={
                  Number.isFinite(Number(durationInput)) && Number(durationInput) > 0
                    ? `${durationSecondsToSpeedKmh(Number(distanceInput) || RUN_TARGET_DISTANCE_KM, Number(durationInput)).toFixed(1)} km/h`
                    : '--'
                }
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveRun()}
              disabled={runSaving}
              className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 disabled:opacity-60"
            >
              {runSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Run
            </button>
          </div>
        </SectionCard>
      ) : null}

      {snapshot && snapshot.sessionType === 'gym' && snapshot.session && !workoutComplete && currentExercise ? (
        <section className="space-y-4 pb-[calc(var(--mobile-page-bottom-cta)+1rem)] lg:pb-0" data-testid="workout-active-player">
          <div className="sticky top-3 z-20 rounded-2xl border border-white/10 bg-[rgba(15,34,34,0.98)] px-4 py-3 shadow-card lg:top-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title ?? 'Workout'}
                </p>
                <p className="mt-1 text-xs font-medium text-white/48">
                  Exercise {exerciseIndex + 1} of {snapshot.exercises.length} · In progress
                  {snapshot.session?.created_at ? ` · ${calculateSessionDurationMinutes(snapshot.session.duration_minutes, snapshot.session.created_at)} min` : ''}
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/82">
                {completedSetCount}/{totalSets} sets
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <SectionCard title={`Exercise ${exerciseIndex + 1} of ${snapshot.exercises.length}`} eyebrow="Workout player" tone="dark">
              <div className="space-y-4 rounded-3xl border border-white/8 bg-white/[0.03] p-4 sm:p-5 lg:space-y-5">
                <div className="flex items-start gap-3">
                  <MediaFrame
                    src={resolveExerciseImageUrl(currentExercise.mediaThumbnailUrl)}
                    alt={currentExercise.mediaAlt}
                    wrapperClassName="h-16 w-16 shrink-0 rounded-2xl"
                    imageClassName="h-full w-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold text-white">{currentExercise.exerciseName}</p>
                    <p className="mt-2 text-sm text-white/54">{currentExercise.targetMuscles ?? currentExercise.exerciseGroup ?? 'Target muscles set in workout plan'}</p>
                    <p className="mt-2 text-sm text-white/46">
                      <span className="lg:hidden">
                        {currentExercise.setCount} × {formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)} · Rest {currentExercise.restSeconds}s
                      </span>
                      <span className="hidden lg:inline">
                        {currentExercise.setCount} sets · {formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)} reps · Rest {currentExercise.restSeconds}s
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Current set</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    Set {currentSetNumber} of {currentExercise.setCount}
                  </p>
                  {currentExercise.mainCue ? <p className="mt-2 text-sm text-white/52">{currentExercise.mainCue}</p> : null}
                </div>

                {completedSets < currentExercise.setCount ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputBlock label={requiresWeight ? 'Weight kg' : 'Weight kg (optional)'}>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weightInput}
                          onChange={(event) => setWeightInput(event.target.value)}
                          className="fd-input"
                          inputMode="decimal"
                        />
                      </InputBlock>
                      <InputBlock label="Reps">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={repsInput}
                          onChange={(event) => setRepsInput(event.target.value)}
                          className="fd-input"
                          inputMode="numeric"
                        />
                      </InputBlock>
                    </div>

                    {!canSaveSet ? (
                      <p className="text-sm text-white/48">
                        {requiresWeight ? 'Enter weight and reps to save this set.' : 'Enter reps to save this set.'}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSaveSet()}
                      disabled={setSaving || !canSaveSet}
                      className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 text-base disabled:opacity-60 hidden lg:inline-flex"
                    >
                      {setSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Set
                    </button>
                  </>
                ) : null}

                {restActive ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Rest timer</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{formatSeconds(restRemaining)}</p>
                    {restRemaining === 0 ? <p className="mt-2 text-sm font-semibold text-white">Rest complete</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setRestActive(false)} className="fd-button-secondary min-h-11 px-4">
                        <TimerReset className="h-4 w-4" />
                        Skip Rest
                      </button>
                      <button type="button" onClick={() => setRestRemaining((current) => current + 30)} className="fd-button-secondary min-h-11 px-4">
                        +30 sec
                      </button>
                      <button
                        type="button"
                        onClick={completedSets >= currentExercise.setCount ? (exerciseIndex < snapshot.exercises.length - 1 ? handleNextExercise : () => setRestActive(false)) : handleNextSet}
                        className="fd-button-secondary min-h-11 px-4"
                      >
                        <ChevronRight className="h-4 w-4" />
                        {completedSets >= currentExercise.setCount
                          ? exerciseIndex < snapshot.exercises.length - 1
                            ? 'Next Exercise'
                            : 'Finish Workout'
                          : 'Next Set'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <SmallButton onClick={() => rememberTriggerAnd(() => setShowCoachNotes(true))} ariaLabel={`Open details for ${currentExercise.exerciseName}`}>Coach notes</SmallButton>
                  <SmallButton
                    onClick={() => rememberTriggerAnd(() => setShowDemo(true))}
                    ariaLabel={`Open demo for ${currentExercise.exerciseName}`}
                    data-testid={`exercise-demo-button-${currentExercise.key}`}
                  >
                    Demo
                  </SmallButton>
                  <SmallButton onClick={() => setShowFullPlan(true)}>Full plan</SmallButton>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/74 lg:border-white/10 lg:bg-white/[0.04]">
                  Clean reps · 1-2 reps in reserve · follow rest timer
                </div>
                <button type="button" onClick={() => setShowRules(true)} className="text-xs font-semibold text-white/42 hidden lg:inline">
                  View rules
                </button>
              </div>
            </SectionCard>

            <div className="space-y-4">
              <Card className="space-y-3" tone="dark">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Saved sets</p>
                {currentExercise.setLogs.length > 0 ? (
                  <div className="space-y-2">
                    {currentExercise.setLogs.map((setLog) => (
                      <div key={setLog.id} className="flex items-center justify-between text-sm text-white/82">
                        <span>Set {setLog.set_number}</span>
                        <span>
                          {typeof setLog.weight_value === 'number' ? `${setLog.weight_value} kg × ` : ''}
                          {setLog.reps ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/46">No saved sets yet.</p>
                )}
              </Card>

              <Card className="space-y-3" tone="dark">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Session progress</p>
                <div className="grid gap-3">
                  <MiniMeta label="Exercise" value={`${exerciseIndex + 1} / ${snapshot.exercises.length}`} />
                  <MiniMeta label="Sets" value={`${completedSetCount} / ${totalSets}`} />
                  <MiniMeta label="Status" value="In Progress" />
                </div>
              </Card>
            </div>
          </div>

          {completedSets < currentExercise.setCount ? (
            <div className="fixed inset-x-0 bottom-[calc(var(--mobile-page-bottom)+0.75rem)] z-30 px-4 lg:hidden">
              <button
                type="button"
                onClick={() => void handleSaveSet()}
                disabled={setSaving || !canSaveSet}
                className="fd-button-accent min-h-12 w-full justify-center gap-2 border border-line/70 px-5 text-base shadow-card disabled:opacity-60"
              >
                {setSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Set
              </button>
            </div>
          ) : null}

          {completedSets >= currentExercise.setCount ? (
            <Card className="space-y-4" tone="dark">
              <p className="text-lg font-semibold text-white">Exercise complete.</p>
              <p className="text-sm text-white/52">
                {exerciseIndex < snapshot.exercises.length - 1
                  ? `Next: ${snapshot.exercises[findNextIncompleteExerciseIndex(snapshot.exercises, exerciseIndex + 1)]?.exerciseName ?? 'Finish workout'}`
                  : 'All planned exercises are done.'}
              </p>
              {getProgressionSuggestion(currentExercise) ? (
                <p className="text-sm text-white/46">{getProgressionSuggestion(currentExercise)}</p>
              ) : null}
              {exerciseIndex < snapshot.exercises.length - 1 ? (
                <button type="button" onClick={handleNextExercise} className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5">
                  <ChevronRight className="h-4 w-4" />
                  Next Exercise
                </button>
              ) : (
                <button type="button" onClick={() => setRestActive(false)} className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5">
                  <CheckCircle2 className="h-4 w-4" />
                  Finish Workout
                </button>
              )}
            </Card>
          ) : null}
        </section>
      ) : null}

      {snapshot && snapshot.sessionType === 'gym' && snapshot.session && workoutComplete ? (
        <SectionCard title="Session completed" eyebrow="Finish workout" tone="dark">
          <div className="space-y-5 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMeta label="Session" value={snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title ?? 'Workout'} />
              <MiniMeta label="Exercises completed" value={`${snapshot.exercises.length} / ${snapshot.exercises.length}`} />
              <MiniMeta label="Sets completed" value={`${completedSetCount} / ${totalSets}`} />
              <MiniMeta label="Total volume" value={`${calculateTotalVolume(snapshot.exercises)} kg`} />
              <MiniMeta label="Duration" value={`${calculateSessionDurationMinutes(snapshot.session.duration_minutes, snapshot.session.created_at)} min`} />
            </div>
            <Card className="space-y-3" tone="dark">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Progression guidance</p>
              <div className="space-y-2">
                {getWorkoutProgressionDetails(snapshot.exercises).map((message) => (
                  <p key={message} className="text-sm text-white/76">{message}</p>
                ))}
              </div>
            </Card>
            <Card className="space-y-2" tone="dark">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/38">Post-workout intake</p>
              <p className="text-sm text-white/82">Protein</p>
              <p className="text-sm text-white/82">Creatine</p>
            </Card>
            <InputBlock label="Optional notes">
              <textarea
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
              />
            </InputBlock>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleFinishWorkout()}
                disabled={finishSaving}
                className="fd-button-accent min-h-12 flex-1 justify-center gap-2 px-5 disabled:opacity-60"
              >
                {finishSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Finish Workout
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {showFullPlan && snapshot ? (
        <BottomSheet title="Full plan" onClose={() => setShowFullPlan(false)}>
          <div className="space-y-3">
            {snapshot.exercises.map((exercise, index) => {
              const loggedSets = getLoggedSetCount(exercise);
              const status = getExerciseStatus(exercise, index, exerciseIndex);
              return (
                <button
                  key={exercise.key}
                  type="button"
                  onClick={() => handleJumpToExercise(index)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <MediaFrame
                        src={resolveExerciseImageUrl(exercise.mediaThumbnailUrl)}
                        alt={exercise.mediaAlt}
                        wrapperClassName="h-12 w-12 rounded-xl"
                        imageClassName="h-full w-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{index + 1}. {exercise.exerciseName}</p>
                        <p className="mt-1 text-sm text-white/46">
                          {loggedSets}/{exercise.setCount} sets done
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold capitalize text-white/82">
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </BottomSheet>
      ) : null}

      {showCoachNotes && currentExercise ? (
        <BottomSheet
          title={`${currentExercise.exerciseName} Details`}
          onClose={() => setShowCoachNotes(false)}
          returnFocusEl={modalReturnFocusEl}
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMeta label="Target" value={currentExercise.targetMuscles ?? currentExercise.exerciseGroup ?? 'Training focus'} />
              <MiniMeta label="Prescription" value={`${currentExercise.setCount} × ${formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)}`} />
              <MiniMeta label="Rest" value={`${currentExercise.restSeconds}s`} />
              <MiniMeta label="Type" value={currentExercise.equipmentType ?? 'Machine / cable'} />
            </div>
            <CoachRow label="Setup cue" value={currentExercise.machineSetup} />
            <CoachRow label="Main cue" value={currentExercise.mainCue} />
            <CoachRow label="Common mistake" value={currentExercise.commonMistake} />
            <CoachRow label="Alternative machine" value={currentExercise.alternatives[0] ?? null} />
          </div>
        </BottomSheet>
      ) : null}

      {showDemo && currentExercise ? (
        <BottomSheet
          title={`${currentExercise.exerciseName} Demo`}
          onClose={() => setShowDemo(false)}
          returnFocusEl={modalReturnFocusEl}
          maxWidthClassName="md:max-w-[960px]"
          dataTestId="exercise-demo-modal"
        >
          <div className="space-y-4">
            {demoImageFailed ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-10 text-center text-sm text-white/46">
                Demo image not available yet.
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                <img
                  src={resolveExerciseImageUrl(currentExercise.mediaFullUrl ?? currentExercise.mediaThumbnailUrl ?? null)}
                  alt={currentExercise.mediaAlt}
                  data-testid="exercise-demo-image"
                  className="mx-auto block h-auto max-h-[58vh] max-w-full object-contain md:max-h-[52vh]"
                  onError={() => setDemoImageFailed(true)}
                />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMeta label="Exercise" value={currentExercise.exerciseName} />
              <MiniMeta label="Target" value={currentExercise.targetMuscles ?? currentExercise.exerciseGroup ?? 'Training focus'} />
              <MiniMeta label="Sets" value={`${currentExercise.setCount}`} />
              <MiniMeta label="Rep range" value={formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)} />
              <MiniMeta label="Rest" value={`${currentExercise.restSeconds}s`} />
              <MiniMeta label="Type" value={currentExercise.equipmentType ?? 'Machine / cable'} />
            </div>
            <CoachRow label="Setup cue" value={currentExercise.machineSetup} />
            <CoachRow label="Main cue" value={currentExercise.mainCue} />
          </div>
        </BottomSheet>
      ) : null}

      {showRules && snapshot ? (
        <BottomSheet title="Session rules" onClose={() => setShowRules(false)} returnFocusEl={modalReturnFocusEl}>
          <div className="space-y-3">
            {snapshot.workoutRules.map((rule) => (
                <div key={rule} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/76">
                  {rule}
                </div>
              ))}
          </div>
        </BottomSheet>
      ) : null}
    </div>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
  returnFocusEl,
  maxWidthClassName = 'md:max-w-[1040px]',
  dataTestId
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  returnFocusEl?: HTMLElement | null;
  maxWidthClassName?: string;
  dataTestId?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = 'workout-modal-title';

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const closeButton = panel.querySelector<HTMLButtonElement>('[data-modal-close="true"]');
    closeButton?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusScope = panelRef.current;
      if (!focusScope) return;

      const focusable = Array.from(
        focusScope.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      returnFocusEl?.focus();
    };
  }, [onClose, returnFocusEl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-[rgba(6,20,20,0.5)] pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-sm md:items-center md:justify-center md:px-6 md:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`flex h-[calc(100vh-env(safe-area-inset-top))] w-full flex-col md:h-auto md:max-h-[85vh] ${maxWidthClassName}`}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid={dataTestId}
          className="flex h-full flex-col rounded-t-[28px] border border-white/10 bg-[rgba(15,34,34,0.98)] shadow-card md:h-auto md:rounded-[28px]"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[rgba(15,34,34,0.98)] px-5 py-4">
            <p id={titleId} className="text-lg font-semibold text-white">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              data-modal-close="true"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-white/82"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:max-h-[calc(85vh-72px)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  ariaLabel,
  dataTestId
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className="fd-button-secondary min-h-10 border-white/10 bg-transparent px-3 text-xs text-white/82 sm:px-4 sm:text-sm"
    >
      {children}
    </button>
  );
}

function InputBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-white/38">{label}</span>
      {children}
    </label>
  );
}

function CoachRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/78">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-3xl border border-[rgba(255,59,48,0.2)] bg-[rgba(255,59,48,0.08)] px-4 py-4 text-sm text-red-200">{message}</div>;
}

function SuccessBanner({ message }: { message: string }) {
  return <div className="rounded-3xl border border-[rgba(52,199,89,0.18)] bg-[rgba(52,199,89,0.08)] px-4 py-4 text-sm font-medium text-green-200">{message}</div>;
}

function getLoggedSetCount(exercise: WorkoutExerciseStep) {
  return exercise.setLogs.length;
}

function findResumeExerciseIndex(exercises: WorkoutExerciseStep[]) {
  const nextIncomplete = exercises.findIndex((exercise) => getLoggedSetCount(exercise) < exercise.setCount);
  return nextIncomplete >= 0 ? nextIncomplete : Math.max(exercises.length - 1, 0);
}

function findNextIncompleteExerciseIndex(exercises: WorkoutExerciseStep[], startIndex: number) {
  const nextIncomplete = exercises.findIndex(
    (exercise, index) => index >= startIndex && getLoggedSetCount(exercise) < exercise.setCount
  );
  return nextIncomplete >= 0 ? nextIncomplete : Math.max(exercises.length - 1, 0);
}

function getExerciseStatus(exercise: WorkoutExerciseStep, index: number, activeIndex: number) {
  const loggedSets = getLoggedSetCount(exercise);
  if (loggedSets >= exercise.setCount) return 'completed';
  if (loggedSets > 0 || index === activeIndex) return 'in progress';
  return 'not started';
}

function formatRepRange(min: number | null, max: number | null) {
  if (min && max) return `${min}-${max}`;
  if (max) return `up to ${max}`;
  if (min) return `${min}+`;
  return 'Flexible';
}

function formatSeconds(seconds: number) {
  const safe = Math.max(seconds, 0);
  const mins = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${mins}:${remainder.toString().padStart(2, '0')}`;
}

function calculateSessionDurationMinutes(savedDurationMinutes: number | null | undefined, createdAt: string) {
  if (typeof savedDurationMinutes === 'number' && Number.isFinite(savedDurationMinutes) && savedDurationMinutes > 0) {
    return Math.round(savedDurationMinutes);
  }

  const createdAtTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtTime)) {
    return 60;
  }

  const elapsedMs = getAppNow().getTime() - createdAtTime;
  const elapsedMinutes = Math.round(elapsedMs / 60000);
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes <= 0) {
    return 60;
  }

  if (elapsedMinutes > 240) {
    return 60;
  }

  return Math.max(1, Math.min(180, elapsedMinutes));
}

function calculateTotalVolume(exercises: WorkoutExerciseStep[]) {
  return exercises.reduce(
    (total, exercise) =>
      total +
      exercise.setLogs.reduce(
        (setTotal, setLog) => setTotal + (setLog.weight_value ?? 0) * (setLog.reps ?? 0),
        0
      ),
    0
  );
}

function getWorkoutProgressionDetails(exercises: WorkoutExerciseStep[]) {
  const recommendations = Array.from(
    new Set(exercises.map((exercise) => getProgressionSuggestion(exercise)).filter(Boolean) as string[])
  );
  if (recommendations.length > 0) return recommendations.slice(0, 3);
  return ['Next time: keep the same weight.'];
}

function formatWorkoutStatus(status: string | null | undefined) {
  if (status === 'ready') return 'Ready';
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'planned') return 'Planned';
  if (status === 'rest') return 'Rest';
  if (!status) return 'Ready';
  return status.replace(/_/g, ' ');
}

function getIntakeHandledCount(intakeGroups: Array<{ items: Array<{ todayLog?: { status?: string | null } | null }> }>) {
  return intakeGroups.reduce(
    (total, group) => total + group.items.filter((item) => item.todayLog?.status === 'taken' || item.todayLog?.status === 'skipped').length,
    0
  );
}

function getIntakePlannedCount(intakeGroups: Array<{ items: unknown[] }>) {
  return intakeGroups.reduce((total, group) => total + group.items.length, 0);
}

function getStartDescription(title: string | null) {
  if (!title) return 'Build the session. Log the work. Finish clean.';
  if (title === 'Push') return 'Build the chest. Widen the frame. Leave 1-2 reps in reserve.';
  if (title === 'Pull') return 'Build the V-shape. Pull with control. No swinging.';
  if (title === 'Legs + Core + Run Intervals') return 'Run controlled. Train legs clean. No glute-heavy work today.';
  if (title === 'Upper Shape') return 'Make the frame wider. Control every rep.';
  if (title === '3.2 km Run + Arms/Core') return 'Run with discipline. Track pace. Finish clean.';
  return 'Build the session. Log the work. Finish clean.';
}

function isBodyweightExercise(exercise: WorkoutExerciseStep) {
  const normalized = exercise.exerciseName.toLowerCase();
  return normalized.includes('plank') || normalized.includes('walking') || normalized.includes('captain chair');
}

function resolveExerciseImageUrl(value: string | null | undefined) {
  if (!value || value.startsWith('coach-media/')) {
    return getExerciseDemoPlaceholder().imageUrl;
  }

  return value;
}
