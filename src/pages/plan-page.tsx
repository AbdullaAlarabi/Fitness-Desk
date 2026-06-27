import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRightLeft, CalendarDays, Check, MoreHorizontal, Play, RotateCcw, Shuffle, SkipForward } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { MediaFrame, Pill, SectionCard, StateCard } from '../components/ui';
import { getDayCoverMedia } from '../data/mediaManifest';
import {
  getPlanWeekSnapshot,
  markPlanDayStatus,
  movePlanDay,
  resetPlanDay,
  shiftPlanForward,
  startPlanDay,
  type PlanDay,
  type PlanStatus,
  type PlanWeekSnapshot
} from '../services/planService';

export function PlanPage() {
  const [snapshot, setSnapshot] = useState<PlanWeekSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [shiftModal, setShiftModal] = useState<PlanDay | null>(null);
  const [moveModal, setMoveModal] = useState<PlanDay | null>(null);
  const [shiftRemaining, setShiftRemaining] = useState(true);
  const [useRecoveryDays, setUseRecoveryDays] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');

  useEffect(() => {
    void loadPlan();
  }, []);

  async function loadPlan() {
    setLoading(true);
    setError('');

    try {
      const next = await getPlanWeekSnapshot();
      setSnapshot(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the weekly plan.');
    } finally {
      setLoading(false);
    }
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError('');
    try {
      await action();
      await loadPlan();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Plan action failed.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSkip(day: PlanDay) {
    await runAction(`skip-${day.dateIso}`, async () => {
      await markPlanDayStatus(day, 'skipped');
    });

    if (!day.isRest) {
      setShiftRemaining(true);
      setUseRecoveryDays(false);
      setShiftModal(day);
    }
  }

  async function confirmShift() {
    if (!shiftModal) return;
    await runAction(`shift-${shiftModal.dateIso}`, async () => {
      await shiftPlanForward({
        sourceDateIso: shiftModal.dateIso,
        shiftRemaining,
        useRecoveryDays
      });
    });
    setShiftModal(null);
  }

  async function confirmMove() {
    if (!moveModal || !moveTarget) return;
    await runAction(`move-${moveModal.dateIso}`, async () => {
      await movePlanDay(moveModal, moveTarget);
    });
    setMoveModal(null);
    setMoveTarget('');
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Weekly split"
        eyebrow="Plan"
        action={
          <button
            type="button"
            onClick={() => void loadPlan()}
            className="fd-button-secondary min-h-11 px-4"
          >
            Refresh
          </button>
        }
      >
        <div className="space-y-4">
          {snapshot?.cycleShifted ? (
            <StateCard
              title="Cycle shifted based on current schedule."
              message="The weekly split is following your current moved or shifted workout dates."
            />
          ) : null}
          {snapshot?.days.map((day) => (
            <PlanDayCard
              key={day.dateIso}
              day={day}
              busy={busyKey?.includes(day.dateIso) ?? false}
              onStart={() => runAction(`start-${day.dateIso}`, () => startPlanDay(day))}
              onComplete={() => runAction(`complete-${day.dateIso}`, () => markPlanDayStatus(day, 'completed'))}
              onSkip={() => void handleSkip(day)}
              onShift={() => {
                setShiftRemaining(true);
                setUseRecoveryDays(false);
                setShiftModal(day);
              }}
              onMove={() => {
                setMoveModal(day);
                setMoveTarget(day.dateIso);
              }}
              onReset={() => runAction(`reset-${day.dateIso}`, () => resetPlanDay(day))}
            />
          ))}

          {loading ? <StateCard title="Loading plan" message="Fetching this week." /> : null}
          {!loading && snapshot?.days.length === 0 ? <StateCard title="No weekly plan" message="No templates found." /> : null}
          {error ? <StateCard title="Plan error" message={error} tone="error" /> : null}
        </div>
      </SectionCard>

      {shiftModal ? (
        <ModalShell title="Shift workouts forward" onClose={() => setShiftModal(null)}>
          <div className="space-y-4 text-sm text-muted">
            <p>
              Shift <span className="font-semibold text-teal">{shiftModal.name}</span> forward to the next available day.
            </p>
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-field p-4">
              <input
                type="checkbox"
                checked={shiftRemaining}
                onChange={(event) => setShiftRemaining(event.target.checked)}
                className="mt-1"
              />
              <span>Also shift the remaining structured workouts forward so the order stays intact.</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-field p-4">
              <input
                type="checkbox"
                checked={useRecoveryDays}
                onChange={(event) => setUseRecoveryDays(event.target.checked)}
                className="mt-1"
              />
              <span>Allow recovery or walking days to be used as targets.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShiftModal(null)}
                className="fd-button-secondary min-h-11 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmShift()}
                className="fd-button-accent min-h-11 px-4"
              >
                Confirm shift
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {moveModal && snapshot ? (
        <ModalShell title="Move to another day" onClose={() => setMoveModal(null)}>
          <div className="space-y-4 text-sm text-muted">
            <p>
              Move <span className="font-semibold text-teal">{moveModal.name}</span> to another date in this week.
            </p>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">Target day</span>
              <select
                value={moveTarget}
                onChange={(event) => setMoveTarget(event.target.value)}
                className="fd-input"
              >
                {snapshot.days.map((day) => (
                  <option key={day.dateIso} value={day.dateIso}>
                    {format(day.date, 'EEEE, MMM d')}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMoveModal(null)}
                className="fd-button-secondary min-h-11 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmMove()}
                className="fd-button-accent min-h-11 px-4"
              >
                Confirm move
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function PlanDayCard({
  day,
  busy,
  onStart,
  onComplete,
  onSkip,
  onShift,
  onMove,
  onReset
}: {
  day: PlanDay;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onShift: () => void;
  onMove: () => void;
  onReset: () => void;
}) {
  const dayMedia = getDayCoverMedia(day.cycleDay.dayNumber);

  return (
    <div className={['rounded-3xl border p-4 shadow-float', day.isRest ? 'border-line bg-card' : 'border-line bg-white'].join(' ')}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{format(day.date, 'EEEE, MMMM d')}</p>
            <StatusPill status={day.status} />
            {day.isRest ? <Pill>Recovery / walking</Pill> : <Pill>Structured day</Pill>}
          </div>
          <p className="text-xl font-semibold text-teal">{`Day ${day.cycleDay.dayNumber}`}</p>
          <p className="text-2xl font-semibold text-teal">{day.name}</p>
          <p className="text-sm leading-6 text-muted">{day.focus}</p>
          <p className="text-sm font-medium text-teal">Estimated duration: {day.durationMinutes} minutes</p>
          <MediaFrame
            src={dayMedia.imageUrl}
            alt={dayMedia.alt}
            wrapperClassName="mt-3 h-28 w-full max-w-sm rounded-[20px] md:h-32"
            imageClassName="h-full w-full object-cover"
            imageStyle={{ objectPosition: dayMedia.objectPosition }}
          />
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
          <div className="hidden md:flex md:flex-wrap md:gap-2 xl:max-w-sm xl:justify-end">
            <ActionButton icon={<Play className="h-4 w-4" />} label="Start" disabled={busy || day.isRest} onClick={onStart} />
            <ActionButton icon={<Check className="h-4 w-4" />} label="Mark complete" disabled={busy || day.isRest} onClick={onComplete} />
            <ActionButton icon={<SkipForward className="h-4 w-4" />} label="Skip" disabled={busy || day.isRest} onClick={onSkip} />
            <ActionButton icon={<Shuffle className="h-4 w-4" />} label="Shift forward" disabled={busy || day.isRest} onClick={onShift} />
            <ActionButton icon={<ArrowRightLeft className="h-4 w-4" />} label="Move to another day" disabled={busy || day.isRest} onClick={onMove} />
            <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Reset day" disabled={busy || !day.scheduledWorkout} onClick={onReset} />
            {day.status === 'planned' && !day.isRest ? (
              <Link
                to={`/workout?date=${day.dateIso}`}
                className="fd-button-accent min-h-11 gap-2 px-4"
              >
                <CalendarDays className="h-4 w-4" />
                Open workout
              </Link>
            ) : null}
          </div>
          <div className="flex w-full items-center gap-2 md:hidden">
            {day.isRest ? (
              <button
                type="button"
                disabled={busy}
                onClick={onComplete}
                className="fd-button-accent min-h-11 flex-1 gap-2 px-4 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Mark walk complete
              </button>
            ) : day.status === 'planned' ? (
              <Link to={`/workout?date=${day.dateIso}`} className="fd-button-accent min-h-11 flex-1 gap-2 px-4">
                <CalendarDays className="h-4 w-4" />
                Open workout
              </Link>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={onStart}
                className="fd-button-accent min-h-11 flex-1 gap-2 px-4 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            )}
            <details className="relative">
              <summary className="fd-button-secondary min-h-11 list-none px-3">
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-14 z-20 w-56 rounded-2xl border border-line bg-white p-2 shadow-card">
                <MobileMenuButton label="Mark complete" icon={<Check className="h-4 w-4" />} disabled={busy || day.isRest} onClick={onComplete} />
                <MobileMenuButton label="Skip" icon={<SkipForward className="h-4 w-4" />} disabled={busy || day.isRest} onClick={onSkip} />
                <MobileMenuButton label="Shift forward" icon={<Shuffle className="h-4 w-4" />} disabled={busy || day.isRest} onClick={onShift} />
                <MobileMenuButton label="Move day" icon={<ArrowRightLeft className="h-4 w-4" />} disabled={busy || day.isRest} onClick={onMove} />
                <MobileMenuButton label="Reset day" icon={<RotateCcw className="h-4 w-4" />} disabled={busy || !day.scheduledWorkout} onClick={onReset} />
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMenuButton({
  icon,
  label,
  disabled,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-teal disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-card px-4 text-sm font-semibold text-teal disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: PlanStatus }) {
  const styles: Record<PlanStatus, string> = {
    planned: 'border-line bg-field text-teal',
    completed: 'border-teal/20 bg-teal text-white',
    skipped: 'border-gold/30 bg-gold/20 text-teal',
    shifted: 'border-gold/25 bg-gold/12 text-teal',
    rest: 'border-line bg-card text-muted',
    missed: 'border-red-300 bg-red-50 text-red-700'
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${styles[status]}`}>{status}</span>;
}

function ModalShell({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-teal/25 px-4">
      <div className="w-full max-w-xl rounded-panel border border-line bg-card p-6 shadow-card">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-teal">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
