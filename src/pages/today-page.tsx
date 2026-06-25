import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, CheckCircle2, Circle, Dumbbell, Loader2, Moon, Play, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, MetricCard, SectionCard, StateCard } from '../components/ui';
import { getWorkoutHeroCopy } from '../data/workout-plan';
import { getDashboardCommandSummary, type DashboardCommandSummary } from '../services/dashboardCommandService';
import {
  getTodaySnapshot,
  saveTodayWeight,
  type IntakeChecklistItem,
  type TodaySnapshot,
  upsertIntakeLog
} from '../services/todayService';

export function TodayPage() {
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [commandSummary, setCommandSummary] = useState<DashboardCommandSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    void loadSnapshot();
  }, []);

  async function loadSnapshot() {
    setLoading(true);
    setError('');

    try {
      const next = await getTodaySnapshot();
      const command = await getDashboardCommandSummary();
      setSnapshot(next);
      setCommandSummary(command);
      setWeightInput(next.body.weightValue?.numeric_value?.toString() ?? '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load today.');
    } finally {
      setLoading(false);
    }
  }

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
      await loadSnapshot();
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
      await loadSnapshot();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save weight.');
    } finally {
      setSavingWeight(false);
    }
  }

  const score = snapshot?.completionScore ?? 0;
  const intakeGroups = (snapshot?.intakeGroups ?? []).filter((group) => group.items.length > 0);
  const intakeItems = intakeGroups.flatMap((group) => group.items);
  const intakeTarget = intakeItems.length;
  const intakeTaken = intakeItems.filter((item) => item.todayLog?.status === 'taken').length;
  const intakeSkipped = intakeItems.filter((item) => item.todayLog?.status === 'skipped').length;
  const intakeFullyDecided = intakeTarget > 0 && intakeItems.every((item) => item.todayLog?.status === 'taken' || item.todayLog?.status === 'skipped');
  const todayWorkoutTitle = snapshot?.workout.cycleDay.title ?? 'Training day';
  const todayWorkoutDetail = `Focus: ${snapshot?.workout.cycleDay.focus ?? 'Training focus loaded from the weekly split.'}`;
  const heroContent = snapshot?.workout.cycleDay ? getWorkoutHeroCopy(snapshot.workout.cycleDay) : getTodayHeroContent(null);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="fd-panel-dark relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-20 top-0 h-40 w-40 rounded-full bg-gold/12 blur-3xl" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/58">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <p className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">TODAY</p>
          <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            {heroContent.title}
          </p>
          <p className="mt-2 max-w-2xl text-sm font-medium uppercase tracking-[0.18em] text-gold">
            {heroContent.focus}
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-7 text-white/84">{heroContent.command}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={`/workout?date=${snapshot?.todayIso ?? format(new Date(), 'yyyy-MM-dd')}`}
              className="fd-button-accent min-w-[176px]"
            >
              <Play className="h-4 w-4" />
              Start session
            </Link>
            <div className="inline-flex min-h-12 items-center rounded-2xl border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white/86">
              {commandSummary?.nextAction ?? 'Start the session. Save the sets. Finish clean.'}
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroMetric label="Today’s workout" value={commandSummary?.todaysWorkout ?? todayWorkoutTitle} />
            <HeroMetric label="Run goal" value="20:00 to 15:00" />
            <HeroMetric label="Completion score" value={`${score}%`} />
            <HeroMetric label="Workout status" value={commandSummary?.workoutStatus ?? 'Ready'} />
          </div>
        </div>

        <SectionCard title="Today’s mission" eyebrow={snapshot?.greeting ?? 'Command'}>
          <div className="grid gap-4">
            <Card>
              <p className="fd-label">Main command line</p>
              <p className="mt-3 text-xl font-semibold leading-tight text-teal">
                {commandSummary?.commandLine ?? 'Train clean. Track honestly. Adjust with data.'}
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-5">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-gold bg-teal text-3xl font-semibold text-gold shadow-float">
                  {loading ? '...' : `${score}%`}
                </div>
                <div className="space-y-3 text-sm text-muted">
                  <p><span className="font-semibold text-teal">Workout</span> 50%</p>
                  <p><span className="font-semibold text-teal">Intake</span> 30%</p>
                  <p><span className="font-semibold text-teal">Check-in</span> 20%</p>
                  <p className="pt-1 font-medium text-teal">You showed up today.</p>
                </div>
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              {(commandSummary?.quickStats ?? fallbackQuickStats).map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} note={card.hint} />
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      {error ? <ErrorBanner message={error} /> : null}
      {loading && !snapshot ? <StateCard title="Loading today" message="Fetching workout, intake, and check-in." /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title={commandSummary?.coachNoteTitle ?? 'Coach note'} eyebrow="Adaptive note">
          <Card>
            <p className="text-lg font-semibold text-teal">{commandSummary?.coachNoteTitle ?? 'Log your first check-in'}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {commandSummary?.coachNoteBody ?? 'Log your first check-in to activate coaching notes.'}
            </p>
          </Card>
        </SectionCard>

        <SectionCard
          title="Today’s Workout"
          eyebrow="Start session"
          action={
            <Link
              to={`/workout?date=${snapshot?.todayIso ?? format(new Date(), 'yyyy-MM-dd')}`}
              className="fd-button-accent"
            >
              <Play className="h-4 w-4" />
              Start session
            </Link>
          }
        >
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-teal">{todayWorkoutTitle}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="fd-label">Focus muscles</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{snapshot?.workout.cycleDay.focus}</p>
                  </div>
                  <div>
                    <p className="fd-label">Estimated duration</p>
                    <p className="mt-2 text-sm font-medium text-teal">
                      {snapshot?.workout.cycleDay.estimatedDurationMinutes ?? 60} minutes
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-field px-4 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Status</p>
                <p className="mt-1 font-semibold text-teal">
                  {snapshot?.workout.sessionCompleted ? 'Complete' : 'Ready'}
                </p>
              </div>
            </div>
          </Card>
        </SectionCard>

        <SectionCard title="Next Workout" eyebrow="Next session is ready">
          <Card>
            <p className="text-lg font-semibold text-teal">{getNextWorkoutLabel(snapshot)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{getNextWorkoutDetail(snapshot)}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal">
              <ArrowRight className="h-4 w-4" />
              Ready
            </div>
          </Card>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Today’s Intake" eyebrow="One-tap checklist">
          {intakeFullyDecided ? (
            <Card className="space-y-3">
              <p className="text-lg font-semibold text-teal">Today&apos;s intake is complete.</p>
              <p className="text-sm text-muted">
                Taken: {intakeTaken} of {intakeTarget}. Skipped: {intakeSkipped}.
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {intakeGroups.map((group) => (
                <div key={group.timing}>
                  <div className="mb-3 flex items-center gap-2">
                    <TimingIcon timing={group.timingKey} />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{group.timing}</h3>
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
          )}
        </SectionCard>

        <SectionCard title="Quick Body Check-in" eyebrow="Today’s weight">
          <Card className="space-y-4">
            <p className="text-sm leading-6 text-muted">Record today’s weight.</p>
            <div className="flex items-end gap-3">
              <label className="flex-1">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Weight (kg)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  className="fd-input"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleWeightSave()}
                disabled={savingWeight}
                className="fd-button-accent disabled:opacity-60"
              >
                {savingWeight ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save
              </button>
            </div>
            <div className="rounded-2xl border border-line bg-field px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Latest</p>
              <p className="mt-2 text-2xl font-semibold text-teal">
                {snapshot?.body.weightValue?.numeric_value ? `${snapshot.body.weightValue.numeric_value} kg` : 'Not logged yet'}
              </p>
            </div>
          </Card>
        </SectionCard>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function IntakeRow({
  item,
  busy,
  onAction
}: {
  item: IntakeChecklistItem;
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
  const [dose, setDose] = useState(item.todayLog?.amount?.toString() ?? '');
  const [notes, setNotes] = useState(item.todayLog?.notes ?? '');
  const [unit, setUnit] = useState(item.todayLog?.unit ?? item.default_unit ?? '');
  const [timeTaken, setTimeTaken] = useState(
    item.todayLog?.logged_at ? format(new Date(item.todayLog.logged_at), 'HH:mm') : ''
  );

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-[rgba(255,255,255,0.28)] p-4 shadow-float sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={status === 'taken'}
            onChange={(event) => {
              if (event.target.checked) {
                onAction(item.id, {
                  status: 'taken',
                  amount: dose ? Number(dose) : null,
                  unit: unit || null,
                  notes: notes || null,
                  timeTaken: timeTaken || null
                });
              }
            }}
            className="mt-1 h-5 w-5 accent-[#BCFF00]"
          />
          <div>
            <p className="font-semibold text-teal">{item.name}</p>
            <p className="mt-1 text-sm text-muted">{item.frequency ?? 'custom'}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              {status === 'taken' ? 'Saved as taken' : status === 'skipped' ? 'Saved as skipped' : 'Not saved yet'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="number"
            min="0"
            step="0.1"
            value={dose}
            onChange={(event) => setDose(event.target.value)}
            placeholder="Optional dose"
            className="min-h-11 rounded-2xl border border-line bg-field px-4 text-sm text-teal outline-none"
          />
          <input
            type="text"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="Unit"
            className="min-h-11 rounded-2xl border border-line bg-field px-4 text-sm text-teal outline-none"
          />
          <input
            type="time"
            value={timeTaken}
            onChange={(event) => setTimeTaken(event.target.value)}
            className="min-h-11 rounded-2xl border border-line bg-field px-4 text-sm text-teal outline-none"
          />
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={status === 'skipped' ? 'Skip reason optional' : 'Notes optional'}
            className="min-h-11 rounded-2xl border border-line bg-field px-4 text-sm text-teal outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onAction(item.id, {
              status: 'taken',
              amount: dose ? Number(dose) : null,
              unit: unit || null,
              notes: notes || null,
              timeTaken: timeTaken || null
            })
          }
            className={[
              'min-h-11 rounded-2xl px-4 text-sm font-semibold',
            status === 'taken' ? 'bg-teal text-white' : 'border border-line bg-field text-teal'
          ].join(' ')}
        >
          {busy && status !== 'skipped' ? 'Saving...' : 'Taken'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onAction(item.id, {
              status: 'skipped',
              amount: dose ? Number(dose) : null,
              unit: unit || null,
              notes: notes || null,
              timeTaken: timeTaken || null
            })
          }
            className={[
              'min-h-11 rounded-2xl px-4 text-sm font-semibold',
            status === 'skipped' ? 'bg-gold text-teal' : 'border border-line bg-field text-muted'
          ].join(' ')}
        >
          {busy && status === 'skipped' ? 'Saving...' : 'Skipped'}
        </button>
      </div>
    </div>
  );
}

function TimingIcon({ timing }: { timing: string }) {
  if (timing === 'night') return <Moon className="h-4 w-4 text-teal" />;
  if (timing === 'post_workout') return <Dumbbell className="h-4 w-4 text-teal" />;
  return <Sun className="h-4 w-4 text-teal" />;
}

function getNextWorkoutLabel(snapshot: TodaySnapshot | null) {
  if (!snapshot?.nextWorkout) return 'Next session loading';
  return snapshot.nextWorkout.title;
}

function getNextWorkoutDetail(snapshot: TodaySnapshot | null) {
  if (!snapshot?.nextWorkout) return 'The weekly split will populate the next session preview.';
  return `${snapshot.nextWorkout.focus} • ${snapshot.nextWorkout.estimatedDurationMinutes} min`;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
      {message}
    </div>
  );
}

const fallbackQuickStats = [
  { label: 'Weight trend', value: 'No logs yet', hint: 'Log daily weight to start the average.' },
  { label: 'Body fat trend', value: 'No logs yet', hint: 'Weekly scans will populate this card.' },
  { label: '3.2 km progress', value: '20:00', hint: 'Current benchmark until runs are logged.' },
  { label: 'Weekly consistency', value: '0%', hint: 'Complete today’s actions to build the score.' }
];

function getTodayHeroContent(templateName: string | null | undefined) {
  const normalized = (templateName ?? '').toLowerCase();

  if (normalized.includes('rest')) {
    return {
      title: 'REST / WALKING',
      focus: 'RECOVERY / EASY MOVEMENT',
      command: 'Recover. Walk 30-45 minutes. Do not add hard running today.'
    };
  }

  if (normalized.includes('pull')) {
    return {
      title: 'PULL — BACK / REAR DELTS / BICEPS',
      focus: 'BACK / REAR DELTS / BICEPS',
      command: 'Build the V-shape. Pull with control. No swinging.'
    };
  }

  if (normalized.includes('legs')) {
    return {
      title: 'LEGS + CORE + INTERVALS',
      focus: 'QUADS / HAMSTRINGS / CORE / INTERVALS',
      command: 'Run controlled. Train legs clean. No glute-heavy work today.'
    };
  }

  if (normalized.includes('upper')) {
    return {
      title: 'UPPER SHAPE — SHOULDERS / CHEST / BACK',
      focus: 'SHOULDERS / CHEST / BACK',
      command: 'Make the frame wider. Control every rep.'
    };
  }

  if (normalized.includes('3.2') || normalized.includes('run')) {
    return {
      title: '3.2 KM RUN + ARMS / CORE',
      focus: 'PACE / ARMS / CORE',
      command: 'Run with discipline. Track pace. Finish clean.'
    };
  }

  return {
    title: 'PUSH — CHEST / SHOULDERS / TRICEPS',
    focus: 'CHEST / SHOULDERS / TRICEPS',
    command: 'Build the chest. Widen the frame. Leave 1-2 reps in reserve.'
  };
}
