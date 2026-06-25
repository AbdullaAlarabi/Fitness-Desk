import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Play, SkipForward, Shuffle } from 'lucide-react';
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
import {
  completeWorkoutSession,
  ensureWorkoutSession,
  getProgressionSuggestion,
  getWorkoutModeSnapshot,
  saveWorkoutSet,
  getProgressionRecommendation,
  type WorkoutExerciseStep,
  type WorkoutModeSnapshot
} from '../services/workoutSessionMode';

export function WorkoutPage() {
  const [searchParams] = useSearchParams();
  const dateIso = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
  const [snapshot, setSnapshot] = useState<WorkoutModeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [setSaving, setSetSaving] = useState(false);
  const [completeSaving, setCompleteSaving] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [repsInput, setRepsInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [rpeInput, setRpeInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [overallRpeInput, setOverallRpeInput] = useState('');
  const [restRemaining, setRestRemaining] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [runType, setRunType] = useState<RunningSessionType>('controlled_3_2km');
  const [distanceInput, setDistanceInput] = useState(RUN_TARGET_DISTANCE_KM.toString());
  const [durationInput, setDurationInput] = useState('1200');
  const [treadmillSpeedInput, setTreadmillSpeedInput] = useState('');
  const [runRpeInput, setRunRpeInput] = useState('');
  const [runSaving, setRunSaving] = useState(false);
  const [expandedExerciseKey, setExpandedExerciseKey] = useState<string | null>(null);
  const [setCompletedChecked, setSetCompletedChecked] = useState(true);
  const [showRules, setShowRules] = useState(false);

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
  const fallbackExerciseCards = snapshot?.planConfig?.detailLevel === 'exact' ? snapshot.planConfig.exercises : [];
  const showFallbackExerciseCards =
    (snapshot?.planConfig?.sessionType === 'gym' || snapshot?.planConfig?.sessionType === 'run') &&
    fallbackExerciseCards.length > 0 &&
    (snapshot?.exercises.length ?? 0) === 0;
  const completedSets = currentExercise?.setLogs.length ?? 0;
  const currentSetNumber = Math.min(completedSets + 1, currentExercise?.setCount ?? 1);
  const progressionSuggestion = currentExercise ? getProgressionSuggestion(currentExercise) : null;
  const progressionRecommendation = currentExercise ? getProgressionRecommendation(currentExercise) : null;

  useEffect(() => {
    if (!currentExercise) return;
    setNotesInput(currentExercise.notes ?? '');
  }, [currentExercise?.key]);

  useEffect(() => {
    if (!currentExercise) return;
    setExpandedExerciseKey(null);
  }, [currentExercise?.key]);

  async function loadSnapshot() {
    setLoading(true);
    setError('');
    try {
      const next = await getWorkoutModeSnapshot(dateIso);
      setSnapshot(next);
      setSessionNotes(next.session?.notes ?? '');
      setOverallRpeInput(next.session?.overall_rpe?.toString() ?? '');
      setExerciseIndex((current) => Math.min(current, Math.max(next.exercises.length - 1, 0)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load workout mode.');
    } finally {
      setLoading(false);
    }
  }

  async function startSession() {
    setSessionLoading(true);
    setError('');
    try {
      await ensureWorkoutSession(dateIso);
      await loadSnapshot();
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not start the session.');
    } finally {
      setSessionLoading(false);
    }
  }

  async function completeSet() {
    if (!snapshot?.session || !currentExercise) return;
    const reps = Number(repsInput);
    const weight = weightInput.trim() ? Number(weightInput) : null;
    const rpe = rpeInput.trim() ? Number(rpeInput) : null;

    if (!Number.isFinite(reps) || reps <= 0) {
      setError('Enter reps completed before saving the set.');
      return;
    }
    if (!setCompletedChecked) {
      setError('Confirm the set is completed before saving it.');
      return;
    }

    if (weight !== null && !Number.isFinite(weight)) {
      setError('Weight must be a valid number in kg.');
      return;
    }

    if (rpe !== null && !Number.isFinite(rpe)) {
      setError('RPE must be a valid number.');
      return;
    }

    setSetSaving(true);
    setError('');
    try {
      await saveWorkoutSet({
        dateIso,
        sessionId: snapshot.session.id,
        exercise: {
          ...currentExercise,
          notes: notesInput
        },
        setNumber: currentSetNumber,
        reps,
        weightKg: weight,
        rpe,
        notes: notesInput || null,
        restSeconds: currentExercise.restSeconds
      });
      setRepsInput('');
      setWeightInput('');
      setRpeInput('');
      setSetCompletedChecked(true);
      setRestRemaining(currentExercise.restSeconds);
      setRestActive(true);
      await loadSnapshot();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the set.');
    } finally {
      setSetSaving(false);
    }
  }

  async function finishSession() {
    if (!snapshot?.session) return;
    const overallRpe = overallRpeInput.trim() ? Number(overallRpeInput) : null;
    if (overallRpe !== null && (!Number.isFinite(overallRpe) || overallRpe < 1 || overallRpe > 10)) {
      setError('Overall RPE must be between 1 and 10.');
      return;
    }
    setCompleteSaving(true);
    setError('');
    try {
      await completeWorkoutSession({
        sessionId: snapshot.session.id,
        scheduledWorkoutId: snapshot.scheduledWorkout?.id ?? null,
        durationMinutes: calculateDurationMinutes(snapshot.session.created_at),
        overallRpe,
        notes: sessionNotes || null
      });
      await loadSnapshot();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'Could not complete the session.');
    } finally {
      setCompleteSaving(false);
    }
  }

  async function saveRun() {
    if (!snapshot?.session) return;
    const distance = Number(distanceInput);
    const duration = Number(durationInput);
    const treadmillSpeed = treadmillSpeedInput.trim() ? Number(treadmillSpeedInput) : null;
    const rpe = runRpeInput.trim() ? Number(runRpeInput) : null;

    if (!Number.isFinite(distance) || distance <= 0) {
      setError('Distance must be a valid number in km.');
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Duration must be a valid number in seconds.');
      return;
    }

    if (rpe !== null && !Number.isFinite(rpe)) {
      setError('RPE must be a valid number.');
      return;
    }

    if (treadmillSpeed !== null && !Number.isFinite(treadmillSpeed)) {
      setError('Treadmill speed must be a valid number in km/h.');
      return;
    }

    setRunSaving(true);
    setError('');
    try {
      const result = await saveRunningSession({
        sessionDate: dateIso,
        runType,
        distanceKm: distance,
        durationSeconds: duration,
        treadmillSpeedKmh: treadmillSpeed,
        rpe,
        notes: sessionNotes || null
      });
      if (result.error) throw result.error;
      await completeWorkoutSession({
        sessionId: snapshot.session.id,
        scheduledWorkoutId: snapshot.scheduledWorkout?.id ?? null,
        durationMinutes: calculateDurationMinutes(snapshot.session.created_at),
        overallRpe: null,
        notes: sessionNotes || null
      });
      await loadSnapshot();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the run.');
    } finally {
      setRunSaving(false);
    }
  }

  async function skipWorkout() {
    setCompleteSaving(true);
    setError('');
    try {
      await markPlanDayStatusByDate(dateIso, 'skipped');
      await loadSnapshot();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not skip the workout.');
    } finally {
      setCompleteSaving(false);
    }
  }

  async function shiftWorkout() {
    setCompleteSaving(true);
    setError('');
    try {
      const day = await getPlanDayByDate(dateIso);
      if (!day) throw new Error('Workout day not found.');
      await markPlanDayStatusByDate(dateIso, 'skipped');
      await shiftPlanForward({
        sourceDateIso: dateIso,
        shiftRemaining: false,
        useRecoveryDays: false
      });
      await loadSnapshot();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not shift the workout.');
    } finally {
      setCompleteSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Workout session mode"
        eyebrow={format(new Date(`${dateIso}T12:00:00`), 'EEEE, MMMM d')}
        action={
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="fd-button-secondary min-h-11 px-4"
          >
            Refresh
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active template</p>
            <p className="mt-2 text-2xl font-semibold text-teal">
              {snapshot?.planConfig?.title ?? snapshot?.scheduledWorkout?.title ?? snapshot?.template?.name ?? 'Scheduled session'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {snapshot?.planConfig ? `Focus: ${snapshot.planConfig.focus}` : snapshot?.scheduledWorkout?.notes ?? snapshot?.template?.description ?? 'Workout mode will follow the scheduled day or the weekly template fallback.'}
            </p>
            {snapshot?.planConfig ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMeta label="Focus" value={snapshot.planConfig.focus} />
                <MiniMeta label="Warm-up" value={snapshot.planConfig.warmup} />
                <MiniMeta label="Duration" value={`${snapshot.planConfig.estimatedDurationMinutes} min`} />
              </div>
            ) : null}
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SummaryCard label="Session type" value={snapshot?.planConfig?.sessionType ?? snapshot?.sessionType ?? '...'} />
            <SummaryCard label="Saved sets" value={String(snapshot?.exercises.reduce((sum, exercise) => sum + exercise.setLogs.length, 0) ?? 0)} />
            <SummaryCard label="Workout status" value={snapshot?.scheduledWorkout?.status ?? 'planned'} />
          </div>
        </div>
      </SectionCard>

      {snapshot?.workoutRules?.length ? (
        <SectionCard title="Session rules" eyebrow="Keep it simple">
          <div className="space-y-3">
            <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-teal">
              {snapshot.sessionType === 'rest'
                ? 'Walk 30-45 min · easy pace · no hard run.'
                : 'Clean reps · 1-2 reps in reserve · follow rest timer'}
            </div>
            <button
              type="button"
              onClick={() => setShowRules((current) => !current)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal"
            >
              {showRules ? 'Hide rules' : 'View rules'}
              <ChevronDown className={`h-4 w-4 transition ${showRules ? 'rotate-180' : ''}`} />
            </button>
            {showRules ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {snapshot.workoutRules.map((rule) => (
                  <div key={rule} className="rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-6 text-teal">
                    {rule}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      {loading && !snapshot ? <StateCard title="Loading session" message="Fetching workout data." /> : null}

      {!snapshot?.session ? (
        <SectionCard title="Start session" eyebrow="Ready">
          <div className="flex flex-col gap-4 rounded-3xl border border-line/70 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-muted">Start this session and begin logging.</p>
            <button
              type="button"
              onClick={() => void startSession()}
              disabled={sessionLoading || loading}
              className="fd-button-accent gap-2 px-5 disabled:opacity-60"
            >
              {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start session
            </button>
          </div>
        </SectionCard>
      ) : null}

      {snapshot && snapshot.sessionType !== 'rest' && snapshot.exercises.length > 0 ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Active exercise" eyebrow={`Exercise ${exerciseIndex + 1} of ${Math.max(snapshot.exercises.length, 1)}`}>
            {currentExercise ? (
              <div className="space-y-5">
                <Card>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-2xl font-semibold text-teal">{currentExercise.exerciseName}</p>
                      <p className="mt-2 text-sm text-muted">
                        {currentExercise.setCount} x {formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)} · Rest {currentExercise.restSeconds}s
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard label="Target sets" value={String(currentExercise.setCount)} />
                      <MetricCard
                        label="Target reps"
                        value={formatRepRange(currentExercise.repRangeMin, currentExercise.repRangeMax)}
                      />
                    </div>
                  </div>
                  {renderCoachNotes({
                    exercise: currentExercise,
                    expanded: expandedExerciseKey === currentExercise.key,
                    onToggle: () => setExpandedExerciseKey((current) => (current === currentExercise.key ? null : currentExercise.key)),
                    notesInput,
                    onNotesChange: setNotesInput
                  })}
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InputBlock label="Set completed">
                    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-card px-4 text-base text-teal">
                      <input
                        type="checkbox"
                        checked={setCompletedChecked}
                        onChange={(event) => setSetCompletedChecked(event.target.checked)}
                        className="h-4 w-4 accent-[#BCFF00]"
                      />
                      <span>Confirm set completion</span>
                    </label>
                  </InputBlock>
                  <InputBlock label={`Set ${currentSetNumber} reps completed`}>
                    <input
                      type="number"
                      min="0"
                      value={repsInput}
                      onChange={(event) => setRepsInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="Weight kg">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={weightInput}
                      onChange={(event) => setWeightInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="RPE optional">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={rpeInput}
                      onChange={(event) => setRpeInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="Rest timer">
                    <div className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-card px-4">
                      <span className="text-base font-semibold text-teal">{formatSeconds(restRemaining || currentExercise.restSeconds)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (restActive) {
                            setRestActive(false);
                          } else {
                            setRestRemaining(restRemaining > 0 ? restRemaining : currentExercise.restSeconds);
                            setRestActive(true);
                          }
                        }}
                        className="text-sm font-semibold text-teal"
                      >
                        {restActive ? 'Pause' : 'Start'}
                      </button>
                    </div>
                  </InputBlock>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void completeSet()}
                    disabled={setSaving || completedSets >= currentExercise.setCount || !snapshot?.session}
                    className="fd-button-accent gap-2 px-5 disabled:opacity-60"
                  >
                    {setSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Complete set
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseIndex((current) => Math.min(current + 1, snapshot.exercises.length - 1))}
                    disabled={exerciseIndex >= snapshot.exercises.length - 1}
                    className="fd-button-secondary gap-2 px-5 disabled:opacity-60"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Next exercise
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseIndex((current) => Math.min(current + 1, snapshot.exercises.length - 1))}
                    disabled={completedSets < currentExercise.setCount}
                    className="fd-button-secondary gap-2 px-5 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete exercise
                  </button>
                </div>

                {progressionSuggestion ? (
                  <div
                    className={[
                      'rounded-3xl px-4 py-4 text-sm font-medium',
                      progressionRecommendation?.tone === 'increase'
                        ? 'border border-gold/25 bg-gold/10 text-teal'
                        : progressionRecommendation?.tone === 'reduce'
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'border border-line bg-card text-teal'
                    ].join(' ')}
                  >
                    {progressionSuggestion}
                  </div>
                ) : null}
              </div>
            ) : (
              <StateCard
                title="No exact exercise list yet"
                message={
                  snapshot.planConfig?.detailLevel === 'split_only'
                    ? 'This day is stored at split level only. Add the remaining coach exercise details when ready.'
                    : 'No exercise rows for this session yet.'
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Exercise list" eyebrow="Scheduled session plan">
            <div className="space-y-4">
              {!snapshot?.session ? (
                <StateCard title="Logging unlocks after start" message="The full exercise list is ready. Start the session to save sets and notes." />
              ) : null}
              {(snapshot.exercises ?? []).map((exercise, index) => (
                <div key={exercise.key} className="rounded-3xl border border-line/70 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-teal">{index + 1}. {exercise.exerciseName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {exercise.setCount} x {formatRepRange(exercise.repRangeMin, exercise.repRangeMax)} · Rest {exercise.restSeconds}s
                      </p>
                      {exercise.targetMuscles ? <p className="mt-1 text-xs text-muted">{exercise.targetMuscles}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExerciseIndex(index)}
                      className="text-sm font-semibold text-teal"
                    >
                      Log here
                    </button>
                  </div>
                  {renderCoachNotes({
                    exercise,
                    expanded: expandedExerciseKey === exercise.key,
                    onToggle: () => setExpandedExerciseKey((current) => (current === exercise.key ? null : exercise.key))
                  })}
                  {exercise.setLogs.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {exercise.setLogs.map((setLog) => (
                        <div key={setLog.id} className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-3 text-sm text-muted">
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className={`h-4 w-4 ${setLog.completed ? 'text-teal' : 'text-muted'}`} />
                            Set {setLog.set_number}
                          </span>
                          <span>{setLog.reps ?? '-'} reps</span>
                          <span>{setLog.weight_value ?? '-'} kg</span>
                          <span>RPE {setLog.rpe ?? '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              <InputBlock label="Session notes">
                <textarea
                  value={sessionNotes}
                  onChange={(event) => setSessionNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
                />
              </InputBlock>

              <InputBlock label="Overall RPE">
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={overallRpeInput}
                  onChange={(event) => setOverallRpeInput(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void finishSession()}
                  disabled={completeSaving || !snapshot?.session}
                  className="fd-button-accent gap-2 px-5 disabled:opacity-60"
                >
                  {completeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Complete
                </button>
                <button
                  type="button"
                  onClick={() => void skipWorkout()}
                  disabled={completeSaving || !snapshot?.scheduledWorkout}
                  className="fd-button-secondary gap-2 px-5 disabled:opacity-60"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => void shiftWorkout()}
                  disabled={completeSaving || !snapshot?.scheduledWorkout}
                  className="fd-button-secondary gap-2 px-5 disabled:opacity-60"
                >
                  <Shuffle className="h-4 w-4" />
                  Shift
                </button>
              </div>
            </div>
          </SectionCard>
        </section>
      ) : null}

      {snapshot && snapshot.sessionType !== 'gym' && snapshot.planConfig?.sessionType !== 'gym' ? (
        <SectionCard title="Session overview" eyebrow={snapshot.sessionType}>
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <p className="text-lg font-semibold text-teal">{snapshot.scheduledWorkout?.title ?? snapshot.template?.name ?? 'Session'}</p>
            <p className="text-sm leading-6 text-muted">
              {snapshot.sessionType === 'rest'
                ? 'Walk 30-45 min · easy pace · no hard run.'
                : snapshot.sessionType === 'run'
                  ? 'Log the run and save the result.'
                  : 'Save the session with notes.'}
            </p>
            {snapshot.sessionType === 'run' ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputBlock label="Run type">
                    <select
                      value={runType}
                      onChange={(event) => setRunType(event.target.value as typeof runType)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    >
                      <option value="interval">Interval run</option>
                      <option value="tempo">Tempo run</option>
                      <option value="controlled_3_2km">Controlled 3.2 km run</option>
                      <option value="test">3.2 km test</option>
                    </select>
                  </InputBlock>
                  <InputBlock label="Distance km">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={distanceInput}
                      onChange={(event) => setDistanceInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="Duration seconds">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={durationInput}
                      onChange={(event) => setDurationInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="Treadmill speed km/h optional">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={treadmillSpeedInput}
                      onChange={(event) => setTreadmillSpeedInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <InputBlock label="Perceived effort / RPE">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={runRpeInput}
                      onChange={(event) => setRunRpeInput(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                    />
                  </InputBlock>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard label="Target 3.2 km" value={formatRunTime(RUN_TARGET_TIME_SECONDS)} />
                  <SummaryCard
                    label="Target pace"
                    value={formatPace(durationSecondsToPace(RUN_TARGET_DISTANCE_KM, RUN_TARGET_TIME_SECONDS))}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard
                    label="Current pace"
                    value={
                      Number.isFinite(Number(durationInput)) && Number(durationInput) > 0
                        ? formatPace(durationSecondsToPace(Number(distanceInput) || RUN_TARGET_DISTANCE_KM, Number(durationInput)))
                        : '--'
                    }
                  />
                  <SummaryCard
                    label="Current speed"
                    value={
                      Number.isFinite(Number(durationInput)) && Number(durationInput) > 0
                        ? `${durationSecondsToSpeedKmh(Number(distanceInput) || RUN_TARGET_DISTANCE_KM, Number(durationInput)).toFixed(1)} km/h`
                        : '--'
                    }
                  />
                </div>

                <InputBlock label="Notes">
                  <textarea
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
                  />
                </InputBlock>

                <button
                  type="button"
                  onClick={() => void saveRun()}
                  disabled={runSaving || !snapshot?.session}
                  className="fd-button-accent gap-2 px-5 disabled:opacity-60"
                >
                  {runSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save run
                </button>
              </div>
            ) : (
              <>
                <InputBlock label="Session notes">
                  <textarea
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
                  />
                </InputBlock>
                <button
                  type="button"
                  onClick={() => void finishSession()}
                  disabled={completeSaving || !snapshot?.session}
                  className="fd-button-accent gap-2 px-5 disabled:opacity-60"
                >
                  {completeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Complete workout
                </button>
              </>
            )}
          </div>
        </SectionCard>
      ) : null}

      {showFallbackExerciseCards ? (
        <SectionCard
          title={snapshot?.planConfig?.sessionType === 'run' ? 'Arms / core exercise cards' : 'Exercise cards'}
          eyebrow={snapshot?.planConfig?.title ?? 'Workout plan'}
        >
          <div className="space-y-4">
            {fallbackExerciseCards.map((exercise, index) => (
              <Card key={exercise.id} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-teal">{index + 1}. {exercise.name}</p>
                    <p className="mt-2 text-sm font-medium text-teal">
                      {exercise.sets} x {exercise.minReps}-{exercise.maxReps}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-line bg-field px-4 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Rest</p>
                    <p className="mt-1 font-semibold text-teal">{exercise.restSeconds}s</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-field px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Target muscle</p>
                  <p className="mt-2 text-sm text-teal">{exercise.targetMuscles ?? 'Training focus'}</p>
                </div>
                <details className="rounded-2xl border border-line bg-card px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-teal">Coach notes</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <CoachDetail label="Setup cue" value={exercise.machineSetup} />
                    <CoachDetail label="Main coaching cue" value={exercise.mainCue} />
                    <CoachDetail label="Common mistake" value={exercise.commonMistake} />
                    <CoachDetail label="Alternative machine" value={exercise.alternatives[0] ?? null} />
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {!loading && snapshot && !snapshot.session && snapshot.sessionType === 'rest' ? (
        <StateCard title="Rest day" message="No lifting log required." />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-teal">{value}</p>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-field px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-teal">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-card px-4 py-3 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-teal">{value}</p>
    </div>
  );
}

function CoachDetail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-line bg-field px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-teal">{value}</p>
    </div>
  );
}

function ExerciseMediaPanel({
  exercise,
  expanded,
  onToggle
}: {
  exercise: WorkoutExerciseStep;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `exercise-demo-${exercise.key}`;

  return (
    <div className="mt-4 rounded-3xl border border-line bg-field/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Demo media</p>
          <p className="mt-1 text-sm text-muted">Tap the image or open the panel for setup and cues.</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="fd-button-secondary min-h-11 gap-2 px-4"
        >
          {expanded ? 'Close demo' : 'View demo'}
          <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="mt-4 block w-full overflow-hidden rounded-[24px] border border-line bg-teal text-left"
      >
        <div className="flex h-48 w-full flex-col items-center justify-center gap-3 bg-teal text-center sm:h-56">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-teal">
            <Play className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Demo media placeholder</p>
          <p className="max-w-xs text-sm text-white/70">Expandable panel ready for licensed image or GIF later.</p>
        </div>
      </button>

      {expanded ? (
        <div id={panelId} className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-[24px] border border-line bg-teal">
            <div className="flex h-64 w-full flex-col items-center justify-center gap-3 bg-teal text-center sm:h-72">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-teal">
                <Play className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold uppercase tracking-[0.18em] text-gold">Demo media placeholder</p>
              <p className="max-w-sm text-sm leading-6 text-white/72">
                Exercise media can be added later without changing the logging flow.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CoachDetail label="Machine setup" value={exercise.machineSetup} />
            <CoachDetail label="Target muscle" value={exercise.targetMuscles} />
            <CoachDetail label="Alternative machine" value={exercise.alternatives[0] ?? null} />
            <CoachDetail label="Rest time" value={`${exercise.restSeconds} seconds`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CoachMediaPlaceholder() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-teal">
      <div className="flex h-48 w-full flex-col items-center justify-center gap-3 bg-teal px-6 text-center sm:h-56">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-teal">
          <Play className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Demo media placeholder</p>
        <p className="max-w-xs text-sm text-white/70">Ready for a licensed image or GIF later.</p>
      </div>
    </div>
  );
}

function renderCoachNotes({
  exercise,
  expanded,
  onToggle,
  notesInput,
  onNotesChange
}: {
  exercise: WorkoutExerciseStep;
  expanded: boolean;
  onToggle: () => void;
  notesInput?: string;
  onNotesChange?: (value: string) => void;
}) {
  const visibleNote = cleanExerciseNote(exercise.notes);
  const hasCoachContent = Boolean(
    exercise.targetMuscles ||
      exercise.machineSetup ||
      exercise.mainCue ||
      exercise.commonMistake ||
      exercise.alternatives.length ||
      visibleNote ||
      onNotesChange
  );

  if (!hasCoachContent) return null;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-teal">Coach notes</span>
        <ChevronDown className={`h-4 w-4 text-teal transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <CoachDetail label="Target muscles" value={exercise.targetMuscles} />
            <CoachDetail label="Setup cue" value={exercise.machineSetup} />
            <CoachDetail label="Main cue" value={exercise.mainCue} />
            <CoachDetail label="Common mistake" value={exercise.commonMistake} />
            <CoachDetail label="Alternative machine" value={exercise.alternatives[0] ?? null} />
            {visibleNote ? <CoachDetail label="Exercise note" value={visibleNote} /> : null}
          </div>
          <CoachMediaPlaceholder />
          {onNotesChange ? (
            <InputBlock label="Notes">
              <textarea
                value={notesInput ?? ''}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
              />
            </InputBlock>
          ) : null}
        </div>
      ) : null}
    </div>
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
      {message}
    </div>
  );
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

function cleanExerciseNote(note: string | null) {
  if (!note) return null;
  const visibleSegment = note
    .split('|')
    .map((segment) => segment.trim())
    .find((segment) => {
      const normalized = segment.toLowerCase();
      return (
        normalized.length > 0 &&
        !normalized.startsWith('media thumb:') &&
        !normalized.startsWith('media full:') &&
        !normalized.startsWith('media type:') &&
        !normalized.startsWith('media alt:')
      );
    });

  return visibleSegment ?? null;
}
