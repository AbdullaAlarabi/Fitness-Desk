import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowRightLeft, CalendarDays, Check, MoreHorizontal, Play, RotateCcw, Shuffle, SkipForward } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge, Card, IconButton, ScheduleCard, SectionCard, StateCard } from '../components/ui';
import { getDayCoverMedia } from '../data/mediaManifest';
import {
  markPlanDayStatus,
  movePlanDay,
  resetPlanDay,
  shiftPlanForward,
  startPlanDay,
  type PlanStatus
} from '../services/planService';
import type { FitnessDeskPlanDay } from '../services/fitnessDeskState';
import { useFitnessDeskState } from '../state/fitnessDeskState';

export function PlanPage() {
  const { state, refresh } = useFitnessDeskState();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [menuDay, setMenuDay] = useState<FitnessDeskPlanDay | null>(null);
  const [shiftModal, setShiftModal] = useState<FitnessDeskPlanDay | null>(null);
  const [moveModal, setMoveModal] = useState<FitnessDeskPlanDay | null>(null);
  const [shiftRemaining, setShiftRemaining] = useState(true);
  const [useRecoveryDays, setUseRecoveryDays] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setError('');
    try {
      await action();
      await refresh();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Plan action failed.');
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStart(day: FitnessDeskPlanDay) {
    const succeeded = await runAction(`start-${day.dateIso}`, () => startPlanDay(day));
    if (succeeded) {
      navigate(`/workout?date=${day.dateIso}`);
    }
  }

  async function handleSkip(day: FitnessDeskPlanDay) {
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
    <div className="space-y-6 pb-[calc(var(--mobile-page-bottom)+0.75rem)] md:pb-10">
      <SectionCard title="Weekly split" eyebrow="Plan">
        <div className="space-y-4">
          <p className="body-copy text-muted">7-day training cycle</p>
          <WeekOverviewStrip weeklyPlan={state.weeklyPlan} currentSessionId={state.currentSessionId} />

          {state.weeklyPlan.some((day) => day.status === 'shifted') ? (
            <StateCard
              title="Cycle shifted based on current schedule."
              message="The weekly split is following your current moved or shifted workout dates."
            />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {state.weeklyPlan.map((day) => (
              <PlanDayCard
                key={day.dateIso}
                day={day}
                isCurrent={day.id === state.currentSessionId}
                isNext={day.id === state.nextSession.id}
                busy={busyKey?.includes(day.dateIso) ?? false}
                onStart={() => void handleStart(day)}
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
                onOpenMenu={() => setMenuDay(day)}
              />
            ))}
          </div>

          {state.weeklyPlan.length === 0 ? <StateCard title="No weekly plan" message="No templates found." /> : null}
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
              <button type="button" onClick={() => setShiftModal(null)} className="fd-button-secondary min-h-11 px-4">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmShift()} className="fd-button-accent min-h-11 px-4">
                Confirm shift
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {moveModal ? (
        <ModalShell title="Move to another day" onClose={() => setMoveModal(null)}>
          <div className="space-y-4 text-sm text-muted">
            <p>
              Move <span className="font-semibold text-teal">{moveModal.name}</span> to another date in this week.
            </p>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">Target day</span>
              <select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} className="fd-input">
                {state.weeklyPlan.map((day) => (
                  <option key={day.dateIso} value={day.dateIso}>
                    {format(day.date, 'EEEE, MMM d')}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setMoveModal(null)} className="fd-button-secondary min-h-11 px-4">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmMove()} className="fd-button-accent min-h-11 px-4">
                Confirm move
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {menuDay ? (
        <ModalShell title={menuDay.name} onClose={() => setMenuDay(null)} mobileSheet>
          <div className="space-y-4 text-sm text-muted">
            <p className="helper-text">{`Day ${menuDay.dayNumber} · ${format(menuDay.date, 'EEEE, MMM d')}`}</p>
            <div className="space-y-2">
              <MobileMenuButton
                label={menuDay.isRest ? 'Mark walk complete' : 'Mark complete'}
                icon={<Check className="h-4 w-4" />}
                disabled={busyKey?.includes(menuDay.dateIso) ?? false}
                onClick={() => {
                  setMenuDay(null);
                  void runAction(`complete-${menuDay.dateIso}`, () => markPlanDayStatus(menuDay, 'completed'));
                }}
              />
              {!menuDay.isRest ? (
                <MobileMenuButton
                  label="Skip"
                  icon={<SkipForward className="h-4 w-4" />}
                  disabled={busyKey?.includes(menuDay.dateIso) ?? false}
                  onClick={() => {
                    setMenuDay(null);
                    void handleSkip(menuDay);
                  }}
                />
              ) : null}
              {!menuDay.isRest ? (
                <MobileMenuButton
                  label="Shift forward"
                  icon={<Shuffle className="h-4 w-4" />}
                  disabled={busyKey?.includes(menuDay.dateIso) ?? false}
                  onClick={() => {
                    setMenuDay(null);
                    setShiftRemaining(true);
                    setUseRecoveryDays(false);
                    setShiftModal(menuDay);
                  }}
                />
              ) : null}
              {!menuDay.isRest ? (
                <MobileMenuButton
                  label="Move to another day"
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                  disabled={busyKey?.includes(menuDay.dateIso) ?? false}
                  onClick={() => {
                    setMenuDay(null);
                    setMoveModal(menuDay);
                    setMoveTarget(menuDay.dateIso);
                  }}
                />
              ) : null}
              <MobileMenuButton
                label="Reset day"
                icon={<RotateCcw className="h-4 w-4" />}
                disabled={busyKey?.includes(menuDay.dateIso) ?? false}
                onClick={() => {
                  const confirmed = window.confirm('Reset this day? This will clear completion for this day.');
                  if (confirmed) {
                    setMenuDay(null);
                    void runAction(`reset-${menuDay.dateIso}`, () => resetPlanDay(menuDay));
                  }
                }}
              />
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function PlanDayCard({
  day,
  isCurrent,
  isNext,
  busy,
  onStart,
  onComplete,
  onSkip,
  onShift,
  onMove,
  onReset,
  onOpenMenu
}: {
  day: FitnessDeskPlanDay;
  isCurrent: boolean;
  isNext: boolean;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onShift: () => void;
  onMove: () => void;
  onReset: () => void;
  onOpenMenu: () => void;
}) {
  const dayMedia = getDayCoverMedia(day.cycleDay.dayNumber);
  const primaryLabel = getPrimaryActionLabel(day, isCurrent);

  return (
    <ScheduleCard
      eyebrow={format(day.date, 'EEE, MMM d')}
      dayLabel={`Day ${day.cycleDay.dayNumber}`}
      date={day.dateIso}
      title={day.name}
      focus={day.focus}
      duration={`${day.durationMin} min`}
      badges={[
        <StatusPill key="status" status={day.status} />,
        <Badge key="type" variant={day.isRest ? 'rest' : 'structured'}>
          {day.isRest ? 'Rest' : 'Structured day'}
        </Badge>,
        isCurrent ? <Badge key="current" variant="ready">Current</Badge> : null,
        !isCurrent && isNext ? <Badge key="next" variant="planned">Next</Badge> : null
      ]}
      image={{
        src: dayMedia.imageUrl,
        alt: dayMedia.alt,
        objectPosition: dayMedia.objectPosition
      }}
      primaryAction={<PrimaryPlanAction day={day} label={primaryLabel} busy={busy} onStart={onStart} onComplete={onComplete} />}
      menuAction={
        <IconButton aria-label={`More actions for ${day.name}`} onClick={onOpenMenu}>
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
      }
      className={isCurrent ? 'border-teal/20 shadow-card' : ''}
    />
  );
}

function PrimaryPlanAction({
  day,
  label,
  busy,
  onStart,
  onComplete
}: {
  day: FitnessDeskPlanDay;
  label: string;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  if (day.isRest) {
    return (
      <button type="button" disabled={busy} onClick={onComplete} className="fd-button-accent min-h-11 w-full gap-2 px-4 xl:w-auto disabled:opacity-50">
        <Check className="h-4 w-4" />
        {label}
      </button>
    );
  }

  if (day.status === 'completed') {
    return (
      <Link to={`/workout?date=${day.dateIso}`} className="fd-button-secondary min-h-11 w-full gap-2 px-4 xl:w-auto">
        <CalendarDays className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  if (label === 'Start Session' || label === 'Continue Session') {
    return (
      <button type="button" disabled={busy} onClick={onStart} className="fd-button-accent min-h-11 w-full gap-2 px-4 xl:w-auto disabled:opacity-50">
        <Play className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Link to={`/workout?date=${day.dateIso}`} className="fd-button-accent min-h-11 w-full gap-2 px-4 xl:w-auto">
      <CalendarDays className="h-4 w-4" />
      {label}
    </Link>
  );
}

function WeekOverviewStrip({
  weeklyPlan,
  currentSessionId
}: {
  weeklyPlan: FitnessDeskPlanDay[];
  currentSessionId: string;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        {weeklyPlan.map((day) => {
          const isCurrent = day.id === currentSessionId;
          return (
            <Card
              key={day.id}
              className={[
                'min-w-[104px] space-y-2 px-4 py-3',
                isCurrent ? 'border-teal/20 bg-teal text-white' : ''
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={isCurrent ? 'text-xs font-semibold uppercase tracking-[0.18em] text-white/72' : 'text-xs font-semibold uppercase tracking-[0.18em] text-muted'}>
                  D{day.dayNumber}
                </p>
                <span className={getOverviewDotClass(day, isCurrent)} />
              </div>
              <p className={isCurrent ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-teal'}>
                {getShortDayName(day)}
              </p>
            </Card>
          );
        })}
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
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-line bg-field px-4 text-sm font-semibold text-teal disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: PlanStatus }) {
  const styles: Record<PlanStatus, string> = {
    ready: 'border-[rgba(188,255,0,0.28)] bg-[rgba(188,255,0,0.14)] text-teal',
    planned: 'border-line bg-field text-teal',
    in_progress: 'border-teal/20 bg-[rgba(6,20,20,0.08)] text-teal',
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
  onClose,
  mobileSheet = false
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  mobileSheet?: boolean;
}) {
  return (
    <div className={mobileSheet ? 'fixed inset-0 z-40 flex items-end justify-center bg-teal/25 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:items-center md:pb-4' : 'fixed inset-0 z-40 flex items-center justify-center bg-teal/25 px-4'}>
      <div className={mobileSheet ? 'w-full max-w-xl rounded-[28px] border border-line bg-card p-6 shadow-card md:rounded-panel' : 'w-full max-w-xl rounded-panel border border-line bg-card p-6 shadow-card'}>
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

function getPrimaryActionLabel(day: FitnessDeskPlanDay, isCurrent: boolean) {
  if (day.isRest) {
    return isCurrent ? 'Mark Walk Complete' : day.status === 'completed' ? 'Review' : 'Preview';
  }

  if (day.status === 'completed') return 'Review';
  if (day.status === 'in_progress') return 'Continue Session';
  if (isCurrent) return 'Start Session';
  return 'Open Workout';
}

function getShortDayName(day: FitnessDeskPlanDay) {
  if (day.dayNumber === 1) return 'Push';
  if (day.dayNumber === 2) return 'Pull';
  if (day.dayNumber === 3) return 'Legs';
  if (day.dayNumber === 4) return 'Rest';
  if (day.dayNumber === 5) return 'Upper';
  if (day.dayNumber === 6) return 'Run';
  return 'Rest';
}

function getOverviewDotClass(day: FitnessDeskPlanDay, isCurrent: boolean) {
  if (isCurrent) return 'h-2.5 w-2.5 rounded-full bg-gold';
  if (day.status === 'completed') return 'h-2.5 w-2.5 rounded-full bg-teal';
  if (day.isRest) return 'h-2.5 w-2.5 rounded-full bg-line';
  if (day.status === 'planned') return 'h-2.5 w-2.5 rounded-full bg-muted';
  if (day.status === 'ready' || day.status === 'in_progress') return 'h-2.5 w-2.5 rounded-full bg-gold';
  return 'h-2.5 w-2.5 rounded-full bg-gold/50';
}
