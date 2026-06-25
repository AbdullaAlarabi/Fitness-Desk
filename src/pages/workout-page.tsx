import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  SkipForward,
  TimerReset,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, SectionCard, StateCard } from '../components/ui';
import { getPlanDayByDate, markPlanDayStatusByDate, shiftPlanForward } from '../services/planService';
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
import { getDayMedia } from '../data/dayMedia';
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

export function WorkoutPage() {
  const [searchParams] = useSearchParams();
  const dateIso = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
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
  const previewExercises = useMemo(
    () => snapshot?.exercises.slice(0, 5).map((exercise) => exercise.exerciseName) ?? [],
    [snapshot?.exercises]
  );
  const dayMedia = getDayMedia(snapshot?.planConfig?.dayNumber ?? 1);

  async function loadSnapshot() {
    setLoading(true);
    setError('');
    try {
      const next = await getWorkoutModeSnapshot(dateIso);
      setSnapshot(next);
      setSessionNotes(next.session?.notes ?? '');
      setExerciseIndex(findResumeExerciseIndex(next.exercises));
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
      await loadSnapshot();
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not start the workout.');
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSaveSet() {
    if (!snapshot?.session || !currentExercise) return;
    const weight = Number(weightInput);
    const reps = Number(repsInput);

    if (!Number.isFinite(weight) || weight < 0) {
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
        weightKg: weight,
        notes: null,
        restSeconds: currentExercise.restSeconds
      });
      setWeightInput('');
      setRepsInput('');
      setRestRemaining(currentExercise.restSeconds);
      setRestActive(true);
      setSuccess('Set saved. Rest started.');
      await loadSnapshot();
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
        durationMinutes: calculateDurationMinutes(snapshot.session.created_at),
        notes: sessionNotes || null
      });
      setSuccess('Workout complete.');
      await loadSnapshot();
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
        durationMinutes: calculateDurationMinutes(snapshot.session.created_at),
        notes: sessionNotes || null
      });
      setSuccess('Run saved.');
      await loadSnapshot();
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
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not complete the walk.');
    } finally {
      setFinishSaving(false);
    }
  }

  async function handleSkipWorkout() {
    setFinishSaving(true);
    setError('');
    setSuccess('');
    try {
      await markPlanDayStatusByDate(dateIso, 'skipped');
      setSuccess('Workout skipped.');
      await loadSnapshot();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not skip the workout.');
    } finally {
      setFinishSaving(false);
    }
  }

  async function handleShiftWorkout() {
    setFinishSaving(true);
    setError('');
    setSuccess('');
    try {
      const day = await getPlanDayByDate(dateIso);
      if (!day) throw new Error('Workout day not found.');
      await markPlanDayStatusByDate(dateIso, 'skipped');
      await shiftPlanForward({
        sourceDateIso: dateIso,
        shiftRemaining: false,
        useRecoveryDays: false
      });
      setSuccess('Workout shifted forward.');
      await loadSnapshot();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not shift the workout.');
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

  return (
    <div className="space-y-6">
      <SectionCard
        title="Workout player"
        eyebrow={format(new Date(`${dateIso}T12:00:00`), 'EEEE, MMMM d')}
        action={
          <button type="button" onClick={() => void loadSnapshot()} className="fd-button-secondary min-h-11 px-4">
            Refresh
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMeta label="Workout" value={snapshot?.planConfig?.title ?? snapshot?.scheduledWorkout?.title ?? 'Session'} />
          <MiniMeta
            label="Focus"
            value={snapshot?.planConfig?.focus ?? snapshot?.template?.description ?? 'Training focus'}
          />
          <MiniMeta
            label="Duration"
            value={`${snapshot?.planConfig?.estimatedDurationMinutes ?? 60} min`}
          />
        </div>
      </SectionCard>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}
      {loading && !snapshot ? <StateCard title="Loading workout" message="Fetching the scheduled session." /> : null}

      {snapshot?.sessionType === 'rest' ? (
        <SectionCard title="Rest / Walking" eyebrow="Recovery day">
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <div className="space-y-2 text-sm text-teal">
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
        <SectionCard title={snapshot.planConfig?.title ?? 'Workout'} eyebrow="Ready to start">
          <div className="space-y-5 rounded-3xl border border-line/70 bg-white p-5">
            <div>
              <p className="text-2xl font-semibold text-teal">{snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title}</p>
              <p className="mt-2 text-sm text-muted">{snapshot.planConfig?.focus}</p>
              <p className="mt-3 text-sm font-medium text-teal">
                {snapshot.exercises.length} exercises · {snapshot.planConfig?.estimatedDurationMinutes ?? 60} min
              </p>
            </div>
            <img
              src={dayMedia.imageUrl}
              alt={dayMedia.alt}
              className="h-24 w-full rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={() => void startWorkout()}
              disabled={sessionLoading}
              className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 disabled:opacity-60"
            >
              {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Workout
            </button>
            <div className="rounded-2xl border border-line bg-card px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Preview</p>
              <p className="mt-2 text-sm leading-6 text-teal">{previewExercises.join(' → ')}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {snapshot && snapshot.sessionType === 'run' && !snapshot.session ? (
        <SectionCard title={snapshot.planConfig?.title ?? 'Run session'} eyebrow="Ready to start">
          <div className="space-y-5 rounded-3xl border border-line/70 bg-white p-5">
            <div>
              <p className="text-2xl font-semibold text-teal">{snapshot.planConfig?.title ?? snapshot.scheduledWorkout?.title}</p>
              <p className="mt-2 text-sm text-muted">{snapshot.planConfig?.focus}</p>
            </div>
            <button
              type="button"
              onClick={() => void startWorkout()}
              disabled={sessionLoading}
              className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 disabled:opacity-60"
            >
              {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Workout
            </button>
          </div>
        </SectionCard>
      ) : null}

      {snapshot && snapshot.sessionType === 'run' && snapshot.session ? (
        <SectionCard title="Run logger" eyebrow={snapshot.planConfig?.title ?? 'Run session'}>
          <div className="space-y-5 rounded-3xl border border-line/70 bg-white p-5">
            <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-teal">
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
        <section className="space-y-4">
          <SectionCard title={`Exercise ${exerciseIndex + 1} of ${snapshot.exercises.length}`} eyebrow="Workout player">
            <div className="space-y-5 rounded-3xl border border-line/70 bg-white p-5">
              <div>
                <p className="text-2xl font-semibold text-teal">{currentExercise.exerciseName}</p>
                <p className="mt-2 text-sm text-muted">
                  {currentExercise.setCount} sets · {formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)} reps · Rest {currentExercise.restSeconds}s
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-card px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Current set</p>
                <p className="mt-2 text-xl font-semibold text-teal">
                  Set {currentSetNumber} of {currentExercise.setCount}
                </p>
              </div>

              {completedSets < currentExercise.setCount ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputBlock label="Weight kg">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={weightInput}
                        onChange={(event) => setWeightInput(event.target.value)}
                        className="fd-input"
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
                      />
                    </InputBlock>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveSet()}
                    disabled={setSaving}
                    className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5 text-base disabled:opacity-60"
                  >
                    {setSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Set
                  </button>
                </>
              ) : null}

              {restActive ? (
                <div className="rounded-2xl border border-line bg-card px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Rest timer</p>
                  <p className="mt-2 text-2xl font-semibold text-teal">{formatSeconds(restRemaining)}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setRestActive(false)} className="fd-button-secondary min-h-11 px-4">
                      <TimerReset className="h-4 w-4" />
                      Skip Rest
                    </button>
                    <button type="button" onClick={handleNextSet} className="fd-button-secondary min-h-11 px-4">
                      <ChevronRight className="h-4 w-4" />
                      Next Set
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <SmallButton onClick={() => setShowCoachNotes(true)}>Coach notes</SmallButton>
                <SmallButton onClick={() => setShowDemo(true)}>Demo</SmallButton>
                <SmallButton onClick={() => setShowFullPlan(true)}>View full plan</SmallButton>
              </div>

              <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-teal">
                Clean reps · 1-2 reps in reserve · follow rest timer
              </div>
              <button type="button" onClick={() => setShowRules(true)} className="text-sm font-semibold text-teal">
                View rules
              </button>
            </div>
          </SectionCard>

          {completedSets >= currentExercise.setCount ? (
            <Card className="space-y-4">
              <p className="text-lg font-semibold text-teal">Exercise complete.</p>
              <p className="text-sm text-muted">
                {exerciseIndex < snapshot.exercises.length - 1
                  ? `Next: ${snapshot.exercises[findNextIncompleteExerciseIndex(snapshot.exercises, exerciseIndex + 1)]?.exerciseName ?? 'Finish workout'}`
                  : 'All planned exercises are done.'}
              </p>
              {getProgressionSuggestion(currentExercise) ? (
                <p className="text-sm text-muted">{getProgressionSuggestion(currentExercise)}</p>
              ) : null}
              {exerciseIndex < snapshot.exercises.length - 1 ? (
                <button type="button" onClick={handleNextExercise} className="fd-button-accent min-h-12 w-full justify-center gap-2 px-5">
                  <ChevronRight className="h-4 w-4" />
                  Next Exercise
                </button>
              ) : null}
            </Card>
          ) : null}
        </section>
      ) : null}

      {snapshot && snapshot.sessionType === 'gym' && snapshot.session && workoutComplete ? (
        <SectionCard title="Workout complete" eyebrow="Finish workout">
          <div className="space-y-5 rounded-3xl border border-line/70 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMeta label="Exercises completed" value={`${snapshot.exercises.length} / ${snapshot.exercises.length}`} />
              <MiniMeta label="Sets completed" value={`${completedSetCount} / ${totalSets}`} />
            </div>
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
              <button
                type="button"
                onClick={() => void handleSkipWorkout()}
                disabled={finishSaving}
                className="fd-button-secondary min-h-12 px-5 disabled:opacity-60"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
              <button
                type="button"
                onClick={() => void handleShiftWorkout()}
                disabled={finishSaving}
                className="fd-button-secondary min-h-12 px-5 disabled:opacity-60"
              >
                Shift
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
                  className="w-full rounded-2xl border border-line bg-card px-4 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <img
                        src={exercise.mediaThumbnailUrl ?? assetUrl('assets/exercises/demo-placeholder.svg')}
                        alt={exercise.mediaAlt}
                        loading="lazy"
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-teal">{index + 1}. {exercise.exerciseName}</p>
                        <p className="mt-1 text-sm text-muted">
                          {loggedSets}/{exercise.setCount} sets done
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold capitalize text-teal">
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
        <BottomSheet title="Coach notes" onClose={() => setShowCoachNotes(false)}>
          <div className="space-y-3">
            <CoachRow label="Setup cue" value={currentExercise.machineSetup} />
            <CoachRow label="Main cue" value={currentExercise.mainCue} />
            <CoachRow label="Common mistake" value={currentExercise.commonMistake} />
            <CoachRow label="Alternative machine" value={currentExercise.alternatives[0] ?? null} />
          </div>
        </BottomSheet>
      ) : null}

      {showDemo && currentExercise ? (
        <BottomSheet title="Demo" onClose={() => setShowDemo(false)}>
          <div className="space-y-4">
            <img
              src={currentExercise.mediaFullUrl ?? currentExercise.mediaThumbnailUrl ?? assetUrl('assets/exercises/demo-placeholder.svg')}
              alt={currentExercise.mediaAlt}
              className="w-full rounded-[24px] border border-line object-cover"
            />
            <CoachRow label="Setup cue" value={currentExercise.machineSetup} />
            <CoachRow label="Main cue" value={currentExercise.mainCue} />
          </div>
        </BottomSheet>
      ) : null}

      {showRules && snapshot ? (
        <BottomSheet title="Session rules" onClose={() => setShowRules(false)}>
          <div className="space-y-3">
            {snapshot.workoutRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-teal">
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
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/30 px-4 pb-4 pt-20 sm:px-6">
      <div className="mx-auto flex h-full max-w-xl flex-col justify-end">
        <div className="rounded-[28px] border border-line bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-lg font-semibold text-teal">{title}</p>
            <button type="button" onClick={onClose} className="rounded-2xl border border-line bg-card p-2 text-teal">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-teal">{value}</p>
    </div>
  );
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="fd-button-secondary min-h-10 px-4 text-sm">
      {children}
    </button>
  );
}

function InputBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function CoachRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-teal">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-3xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">{message}</div>;
}

function SuccessBanner({ message }: { message: string }) {
  return <div className="rounded-3xl border border-line bg-white px-4 py-4 text-sm font-medium text-teal">{message}</div>;
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

function calculateDurationMinutes(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.round(elapsedMs / 60000));
}
