import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, LoadingSkeleton, SectionCard, StateCard, StatusTile } from '../components/ui';
import {
  calculateBmi,
  calculateBmr,
  calculateBodyFatMass,
  calculateLeanBodyMass,
  getBodyDashboardSnapshot,
  saveDailyQuickCheckin,
  saveWeeklyFullCheckin,
  type BodyDashboardSnapshot,
  type BodyMetricKey,
  type BodyRangeFilter
} from '../services/bodyDashboardService';
import { useFitnessDeskState } from '../state/fitnessDeskState';

const chartTabs: Array<{ key: BodyMetricKey; label: string }> = [
  { key: 'weight', label: 'Weight' },
  { key: 'body_fat', label: 'Body Fat' },
  { key: 'body_water', label: 'Body Water' },
  { key: 'muscle_mass', label: 'Muscle' }
];

const rangeOptions: BodyRangeFilter[] = ['7D', '30D', '90D', 'All'];

export function BodyPage() {
  const { state: appState, refresh } = useFitnessDeskState();
  const [snapshot, setSnapshot] = useState<BodyDashboardSnapshot | null>(null);
  const [activeMode, setActiveMode] = useState<'daily' | 'weekly'>('daily');
  const [range, setRange] = useState<BodyRangeFilter>('30D');
  const [chartMetric, setChartMetric] = useState<BodyMetricKey>('weight');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [showDailyExtras, setShowDailyExtras] = useState(false);
  const [showCoreGroup, setShowCoreGroup] = useState(true);
  const [showCompositionGroup, setShowCompositionGroup] = useState(false);
  const [showMetabolicGroup, setShowMetabolicGroup] = useState(false);
  const [showAdvancedGroup, setShowAdvancedGroup] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickEnergy, setQuickEnergy] = useState('');
  const [quickSleep, setQuickSleep] = useState('');
  const [quickSoreness, setQuickSoreness] = useState('');
  const [weeklyValues, setWeeklyValues] = useState({
    weight: '',
    bodyFat: '',
    bodyWater: '',
    muscle: '',
    bmi: '',
    bmr: '',
    visceralFat: '',
    boneMass: '',
    protein: '',
    skeletalMuscleMass: '',
    subcutaneousFat: '',
    bodyAge: '',
    bodyType: '',
    waistCm: '',
    notes: ''
  });

  useEffect(() => {
    void loadDashboard(range);
  }, [range]);

  const chartData = snapshot?.series[chartMetric] ?? [];
  const hasChartData = chartTabs.some((tab) => (snapshot?.series[tab.key] ?? []).length > 0);
  const latestWeightValue = appState.body.dailyWeightKg ?? getMetricCardValue(snapshot, 'weight');
  const latestWeightLabel = latestWeightValue !== null ? `${latestWeightValue} kg` : 'Not logged yet';
  const latestWeightDate = appState.body.latestDailyCheckinDate ?? snapshot?.latestDaily?.checkinDate ?? null;
  const latestWeeklySummary = getLatestWeeklySummary(snapshot);
  const latestDailyLoggedToday = appState.body.latestDailyCheckinDate === appState.todayIso;

  const weeklyWeightNumber = Number(weeklyValues.weight);
  const weeklyBodyFatNumber = Number(weeklyValues.bodyFat);
  const derivedBmi =
    Number.isFinite(weeklyWeightNumber) && weeklyWeightNumber > 0 ? calculateBmi(weeklyWeightNumber) : null;
  const derivedBodyFatMass =
    Number.isFinite(weeklyWeightNumber) &&
    Number.isFinite(weeklyBodyFatNumber) &&
    weeklyWeightNumber > 0 &&
    weeklyBodyFatNumber > 0
      ? calculateBodyFatMass(weeklyWeightNumber, weeklyBodyFatNumber)
      : null;
  const derivedLeanBodyMass =
    Number.isFinite(weeklyWeightNumber) &&
    Number.isFinite(weeklyBodyFatNumber) &&
    weeklyWeightNumber > 0 &&
    weeklyBodyFatNumber > 0
      ? calculateLeanBodyMass(weeklyWeightNumber, weeklyBodyFatNumber)
      : null;
  const derivedBmr =
    Number.isFinite(weeklyWeightNumber) && weeklyWeightNumber > 0 ? calculateBmr(weeklyWeightNumber) : null;

  const quickWeightNumber = Number(quickWeight);
  const canSaveQuick = Number.isFinite(quickWeightNumber) && quickWeightNumber > 20 && quickWeightNumber < 300;

  async function loadDashboard(nextRange: BodyRangeFilter) {
    setLoading(true);
    setError('');
    try {
      const next = await getBodyDashboardSnapshot(nextRange);
      setSnapshot(next);
      const weightCard = next.cards.find((card) => card.key === 'weight');
      if (typeof weightCard?.value === 'number') {
        setQuickWeight(weightCard.value.toString());
      }
      setQuickEnergy(next.latestDaily?.energyLevel?.toString() ?? '');
      setQuickSleep(next.latestDaily?.sleepHours?.toString() ?? '');
      setQuickSoreness(next.latestDaily?.sorenessLevel?.toString() ?? '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load body dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickCheckin() {
    const weight = Number(quickWeight);
    if (!Number.isFinite(weight) || weight <= 20 || weight >= 300) {
      setError('Enter a valid weight in kg.');
      return;
    }

    const energyLevel = quickEnergy ? Number(quickEnergy) : null;
    const sorenessLevel = quickSoreness ? Number(quickSoreness) : null;
    if ((energyLevel !== null && (energyLevel < 1 || energyLevel > 5)) || (sorenessLevel !== null && (sorenessLevel < 1 || sorenessLevel > 5))) {
      setError('Energy and soreness use a 1–5 scale.');
      return;
    }

    setSavingQuick(true);
    setError('');
    setSuccess('');
    try {
      await saveDailyQuickCheckin({
        checkinDate: appState.todayIso,
        weight,
        energyLevel,
        sleepHours: quickSleep ? Number(quickSleep) : null,
        sorenessLevel,
        notes: quickNotes || null
      });
      setQuickNotes('');
      setSuccess('Weight saved.');
      await refresh();
      await loadDashboard(range);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the daily check-in.');
    } finally {
      setSavingQuick(false);
    }
  }

  async function handleWeeklyCheckin() {
    const weight = Number(weeklyValues.weight);
    const bodyFat = Number(weeklyValues.bodyFat);
    const bodyWater = Number(weeklyValues.bodyWater);
    const muscle = Number(weeklyValues.muscle);

    if ([weight, bodyFat, bodyWater, muscle].some((value) => !Number.isFinite(value) || value <= 0)) {
      setError('Weekly full check-in requires weight, body fat %, body water %, and muscle kg. For weight-only tracking, use Daily Check-In.');
      return;
    }

    setSavingWeekly(true);
    setError('');
    setSuccess('');
    try {
      await saveWeeklyFullCheckin({
        checkinDate: appState.todayIso,
        weight,
        bodyFat,
        bodyWater,
        muscle,
        bmi: derivedBmi,
        bmr: weeklyValues.bmr ? Number(weeklyValues.bmr) : null,
        visceralFat: weeklyValues.visceralFat ? Number(weeklyValues.visceralFat) : null,
        boneMass: weeklyValues.boneMass ? Number(weeklyValues.boneMass) : null,
        protein: weeklyValues.protein ? Number(weeklyValues.protein) : null,
        skeletalMuscleMass: weeklyValues.skeletalMuscleMass ? Number(weeklyValues.skeletalMuscleMass) : null,
        subcutaneousFat: weeklyValues.subcutaneousFat ? Number(weeklyValues.subcutaneousFat) : null,
        bodyAge: weeklyValues.bodyAge ? Number(weeklyValues.bodyAge) : null,
        bodyType: weeklyValues.bodyType || null,
        waistCm: weeklyValues.waistCm ? Number(weeklyValues.waistCm) : null,
        notes: weeklyValues.notes || null
      });
      setSuccess('Weekly scan saved.');
      await refresh();
      await loadDashboard(range);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the weekly scan.');
    } finally {
      setSavingWeekly(false);
    }
  }

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      <Card className="space-y-2">
        <p className="fd-label">Body</p>
        <p className="section-title text-teal">Log weight daily. Run full scan weekly.</p>
      </Card>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}
      {loading && !snapshot ? <LoadingSkeleton lines={4} /> : null}

      <div className="flex gap-2">
        <SegmentButton active={activeMode === 'daily'} onClick={() => setActiveMode('daily')}>
          Daily
        </SegmentButton>
        <SegmentButton active={activeMode === 'weekly'} onClick={() => setActiveMode('weekly')}>
          Weekly Scan
        </SegmentButton>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {(activeMode === 'daily' || windowWidthSafeDesktop()) ? (
            <SectionCard title="Daily Check-In" eyebrow="Today’s Weight">
              <div className="space-y-4">
                <Card className="space-y-4">
                  <InputBlock label="Weight">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        value={quickWeight}
                        onChange={(event) => setQuickWeight(event.target.value)}
                        className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 pr-14 text-base text-teal outline-none"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">kg</span>
                    </div>
                  </InputBlock>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatusTile label="Latest" value={latestWeightLabel} helper={latestWeightDate ? `Latest: ${latestWeightDate}` : 'Not logged yet'} />
                    <StatusTile label="Status" value={latestDailyLoggedToday ? 'Logged today' : 'Not logged yet'} />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleQuickCheckin()}
                    disabled={savingQuick || !canSaveQuick}
                    className="fd-button-accent w-full justify-center disabled:opacity-60"
                  >
                    {savingQuick ? 'Saving...' : 'Save Weight'}
                  </button>
                </Card>

                <Card className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="fd-label">Optional daily notes</p>
                    <button type="button" onClick={() => setShowDailyExtras((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                      {showDailyExtras ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showDailyExtras ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <InputBlock label="Energy 1–5">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            inputMode="numeric"
                            value={quickEnergy}
                            onChange={(event) => setQuickEnergy(event.target.value)}
                            className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                          />
                        </InputBlock>
                        <InputBlock label="Sleep hours">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            inputMode="decimal"
                            value={quickSleep}
                            onChange={(event) => setQuickSleep(event.target.value)}
                            className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                          />
                        </InputBlock>
                        <InputBlock label="Soreness 1–5">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            inputMode="numeric"
                            value={quickSoreness}
                            onChange={(event) => setQuickSoreness(event.target.value)}
                            className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                          />
                        </InputBlock>
                      </div>
                      <InputBlock label="Notes">
                        <textarea
                          value={quickNotes}
                          onChange={(event) => setQuickNotes(event.target.value)}
                          rows={3}
                          className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
                        />
                      </InputBlock>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Energy, sleep, soreness, and notes are optional.</p>
                  )}
                </Card>
              </div>
            </SectionCard>
          ) : null}

          {(activeMode === 'weekly' || windowWidthSafeDesktop()) ? (
            <SectionCard title="Weekly Scan" eyebrow="Full scale metrics">
              <div className="space-y-4">
                <Card className="space-y-4">
                  <p className="card-title text-teal">Latest</p>
                  {latestWeeklySummary ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatusTile label="Weight" value={latestWeeklySummary.weight} />
                      <StatusTile label="BMI" value={latestWeeklySummary.bmi} />
                      <StatusTile label="Body Fat" value={latestWeeklySummary.bodyFat} />
                      <StatusTile label="Muscle" value={latestWeeklySummary.muscle} />
                    </div>
                  ) : (
                    <StateCard title="No weekly scan yet." message="Save a weekly scan to build the summary." />
                  )}
                </Card>

                <AccordionCard
                  title="Core"
                  helper="Weight, BMI, body fat, and muscle mass."
                  open={showCoreGroup}
                  onToggle={() => setShowCoreGroup((current) => !current)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetricField label="Weight" unit="kg" value={weeklyValues.weight} onChange={(value) => setWeeklyValues((current) => ({ ...current, weight: value }))} />
                    <ReadOnlyField label="BMI" value={derivedBmi !== null ? derivedBmi.toFixed(1) : 'Calculated after weight'} />
                    <MetricField label="Body Fat" unit="%" value={weeklyValues.bodyFat} onChange={(value) => setWeeklyValues((current) => ({ ...current, bodyFat: value }))} />
                    <MetricField label="Muscle Mass" unit="kg" value={weeklyValues.muscle} onChange={(value) => setWeeklyValues((current) => ({ ...current, muscle: value }))} />
                  </div>
                </AccordionCard>

                <AccordionCard
                  title="Composition"
                  helper="Water, fat mass, lean body mass, and bone mass."
                  open={showCompositionGroup}
                  onToggle={() => setShowCompositionGroup((current) => !current)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetricField label="Water" unit="%" value={weeklyValues.bodyWater} onChange={(value) => setWeeklyValues((current) => ({ ...current, bodyWater: value }))} />
                    <ReadOnlyField label="Body Fat Mass" value={derivedBodyFatMass !== null ? `${derivedBodyFatMass.toFixed(1)} kg` : 'Calculated after body fat'} />
                    <ReadOnlyField label="Lean Body Mass" value={derivedLeanBodyMass !== null ? `${derivedLeanBodyMass.toFixed(1)} kg` : 'Calculated after body fat'} />
                    <MetricField label="Bone Mass" unit="kg" value={weeklyValues.boneMass} onChange={(value) => setWeeklyValues((current) => ({ ...current, boneMass: value }))} />
                  </div>
                </AccordionCard>

                <AccordionCard
                  title="Metabolic"
                  helper="BMR, visceral fat, body age, and body type."
                  open={showMetabolicGroup}
                  onToggle={() => setShowMetabolicGroup((current) => !current)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetricField label="BMR" unit="kcal" value={weeklyValues.bmr} onChange={(value) => setWeeklyValues((current) => ({ ...current, bmr: value }))} />
                    <ReadOnlyField label="BMR Estimate" value={derivedBmr !== null ? `${Math.round(derivedBmr)} kcal` : 'Calculated after weight'} />
                    <MetricField label="Visceral Fat" value={weeklyValues.visceralFat} onChange={(value) => setWeeklyValues((current) => ({ ...current, visceralFat: value }))} />
                    <MetricField label="Body Age" unit="years" value={weeklyValues.bodyAge} onChange={(value) => setWeeklyValues((current) => ({ ...current, bodyAge: value }))} />
                    <TextField label="Body Type" value={weeklyValues.bodyType} onChange={(value) => setWeeklyValues((current) => ({ ...current, bodyType: value }))} />
                    <MetricField label="Waist" unit="cm" value={weeklyValues.waistCm} onChange={(value) => setWeeklyValues((current) => ({ ...current, waistCm: value }))} />
                  </div>
                </AccordionCard>

                <AccordionCard
                  title="Advanced"
                  helper="Protein, skeletal muscle mass, and subcutaneous fat."
                  open={showAdvancedGroup}
                  onToggle={() => setShowAdvancedGroup((current) => !current)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetricField label="Protein" unit="%" value={weeklyValues.protein} onChange={(value) => setWeeklyValues((current) => ({ ...current, protein: value }))} />
                    <MetricField label="Skeletal Muscle Mass" unit="kg" value={weeklyValues.skeletalMuscleMass} onChange={(value) => setWeeklyValues((current) => ({ ...current, skeletalMuscleMass: value }))} />
                    <MetricField label="Subcutaneous Fat" unit="%" value={weeklyValues.subcutaneousFat} onChange={(value) => setWeeklyValues((current) => ({ ...current, subcutaneousFat: value }))} />
                  </div>
                </AccordionCard>

                <Card className="space-y-4">
                  <InputBlock label="Notes">
                    <textarea
                      value={weeklyValues.notes}
                      onChange={(event) => setWeeklyValues((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
                    />
                  </InputBlock>
                  <button
                    type="button"
                    onClick={() => void handleWeeklyCheckin()}
                    disabled={savingWeekly}
                    className="fd-button-accent w-full justify-center disabled:opacity-60"
                  >
                    {savingWeekly ? 'Saving...' : 'Save Weekly Scan'}
                  </button>
                </Card>
              </div>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-4">
          <SectionCard title="Latest" eyebrow="Summary">
            <div className="grid gap-3">
              <StatusTile label="Weight" value={latestWeightLabel} helper={latestWeightDate ? `Latest: ${latestWeightDate}` : 'Not logged yet'} />
              <StatusTile
                label="Body Fat"
                value={formatSnapshotMetric(snapshot, 'body_fat', '%')}
                helper={latestWeeklySummary ? 'From latest weekly scan.' : 'No weekly scan yet.'}
              />
              <StatusTile
                label="Body Water"
                value={formatSnapshotMetric(snapshot, 'body_water', '%')}
                helper={latestWeeklySummary ? 'From latest weekly scan.' : 'No weekly scan yet.'}
              />
              <StatusTile
                label="Muscle"
                value={formatSnapshotMetric(snapshot, 'muscle_mass', 'kg')}
                helper={latestWeeklySummary ? 'From latest weekly scan.' : 'No weekly scan yet.'}
              />
            </div>
          </SectionCard>

          {hasChartData ? (
            <SectionCard
              title="Trends"
              eyebrow="Real data"
              action={
                <button type="button" onClick={() => setShowCharts((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                  {showCharts ? 'Hide charts' : 'Show charts'}
                </button>
              }
            >
              {showCharts ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {chartTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setChartMetric(tab.key)}
                        className={[
                          'min-h-10 rounded-2xl px-4 text-sm font-semibold',
                          chartMetric === tab.key ? 'bg-teal text-white' : 'border border-line bg-card text-teal'
                        ].join(' ')}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rangeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRange(option)}
                        className={[
                          'min-h-10 rounded-2xl px-4 text-sm font-semibold',
                          range === option ? 'bg-gold text-teal' : 'border border-line bg-card text-muted'
                        ].join(' ')}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="h-72">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                          <XAxis dataKey="date" stroke="#96998C" />
                          <YAxis stroke="#96998C" />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#061414" strokeWidth={3} dot={{ fill: '#BCFF00', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <StateCard title="No chart data" message="Log more check-ins to build this trend." />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Open charts when you want the full trend view.</p>
              )}
            </SectionCard>
          ) : null}

          <SectionCard title="Consistency reminder" eyebrow="Best comparison">
            <p className="text-sm leading-6 text-muted">
              For best comparison, measure under similar conditions: morning, after bathroom, before food, using the same scale.
            </p>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-11 rounded-2xl px-4 text-sm font-semibold',
        active ? 'bg-teal text-white' : 'border border-line bg-card text-teal'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function AccordionCard({
  title,
  helper,
  open,
  onToggle,
  children
}: {
  title: string;
  helper: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="card-title text-teal">{title}</p>
          <p className="helper-text mt-2 text-muted">{helper}</p>
        </div>
        <button type="button" onClick={onToggle} className="fd-button-secondary min-h-10 px-4">
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open ? children : null}
    </Card>
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

function MetricField({
  label,
  value,
  onChange,
  unit
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
}) {
  return (
    <InputBlock label={label}>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 pr-16 text-base text-teal outline-none"
        />
        {unit ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">{unit}</span> : null}
      </div>
    </InputBlock>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InputBlock label={label}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
      />
    </InputBlock>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-teal">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white px-4 py-4 text-sm font-medium text-teal">
      {message}
    </div>
  );
}

function getMetricCardValue(snapshot: BodyDashboardSnapshot | null, key: BodyMetricKey) {
  return snapshot?.cards.find((card) => card.key === key)?.value ?? null;
}

function formatSnapshotMetric(snapshot: BodyDashboardSnapshot | null, key: BodyMetricKey, fallbackUnit: string) {
  const card = snapshot?.cards.find((item) => item.key === key) ?? null;
  if (!card || card.value === null) return 'No data';
  return `${card.value} ${card.unit ?? fallbackUnit}`;
}

function getLatestWeeklySummary(snapshot: BodyDashboardSnapshot | null) {
  if (!snapshot) return null;
  const weight = snapshot.cards.find((card) => card.key === 'weight');
  const bodyFat = snapshot.cards.find((card) => card.key === 'body_fat');
  const bodyWater = snapshot.cards.find((card) => card.key === 'body_water');
  const muscle = snapshot.cards.find((card) => card.key === 'muscle_mass');
  const bmi = snapshot.calculatedMetrics.find((metric) => metric.key === 'bmi');

  if (!bodyFat?.recordedAt && !bodyWater?.recordedAt && !muscle?.recordedAt) return null;

  return {
    weight: weight?.value !== null && weight?.value !== undefined ? `${weight.value} ${weight.unit ?? 'kg'}` : 'No data',
    bmi: bmi?.value ?? 'No data',
    bodyFat: bodyFat?.value !== null && bodyFat?.value !== undefined ? `${bodyFat.value} ${bodyFat.unit ?? '%'}` : 'No data',
    muscle: muscle?.value !== null && muscle?.value !== undefined ? `${muscle.value} ${muscle.unit ?? 'kg'}` : 'No data'
  };
}

function windowWidthSafeDesktop() {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1280;
}
