import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SectionCard, StateCard } from '../components/ui';
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

const chartTabs: Array<{ key: BodyMetricKey; label: string }> = [
  { key: 'weight', label: 'Weight' },
  { key: 'body_fat', label: 'Body Fat' },
  { key: 'body_water', label: 'Body Water' },
  { key: 'muscle_mass', label: 'Muscle' }
];

const rangeOptions: BodyRangeFilter[] = ['7D', '30D', '90D', 'All'];

export function BodyPage() {
  const [snapshot, setSnapshot] = useState<BodyDashboardSnapshot | null>(null);
  const [range, setRange] = useState<BodyRangeFilter>('30D');
  const [chartMetric, setChartMetric] = useState<BodyMetricKey>('weight');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickEnergy, setQuickEnergy] = useState('');
  const [quickSleep, setQuickSleep] = useState('');
  const [quickSoreness, setQuickSoreness] = useState('');
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);
  const [showLatestMetrics, setShowLatestMetrics] = useState(false);
  const [showCalculatedMetrics, setShowCalculatedMetrics] = useState(false);
  const [showStatusLabels, setShowStatusLabels] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
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
  const weeklyWeightNumber = Number(weeklyValues.weight);
  const weeklyBodyFatNumber = Number(weeklyValues.bodyFat);
  const derivedBmi =
    Number.isFinite(weeklyWeightNumber) && weeklyWeightNumber > 0 ? calculateBmi(weeklyWeightNumber) : null;
  const derivedBodyFatMass =
    Number.isFinite(weeklyWeightNumber) && Number.isFinite(weeklyBodyFatNumber) && weeklyWeightNumber > 0 && weeklyBodyFatNumber > 0
      ? calculateBodyFatMass(weeklyWeightNumber, weeklyBodyFatNumber)
      : null;
  const derivedLeanBodyMass =
    Number.isFinite(weeklyWeightNumber) && Number.isFinite(weeklyBodyFatNumber) && weeklyWeightNumber > 0 && weeklyBodyFatNumber > 0
      ? calculateLeanBodyMass(weeklyWeightNumber, weeklyBodyFatNumber)
      : null;
  const derivedBmr =
    Number.isFinite(weeklyWeightNumber) && weeklyWeightNumber > 0 ? calculateBmr(weeklyWeightNumber) : null;

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
    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Enter a valid weight for the daily check-in.');
      return;
    }

    setSavingQuick(true);
    setError('');
    try {
      await saveDailyQuickCheckin({
        checkinDate: format(new Date(), 'yyyy-MM-dd'),
        weight,
        energyLevel: quickEnergy ? Number(quickEnergy) : null,
        sleepHours: quickSleep ? Number(quickSleep) : null,
        sorenessLevel: quickSoreness ? Number(quickSoreness) : null,
        notes: quickNotes || null
      });
      setQuickNotes('');
      await loadDashboard(range);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the quick check-in.');
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
      setError('Weekly full check-in requires weight, body fat %, body water %, and muscle kg. For weight-only tracking, use Daily Quick Check-in.');
      return;
    }

    setSavingWeekly(true);
    setError('');
    try {
      await saveWeeklyFullCheckin({
        checkinDate: format(new Date(), 'yyyy-MM-dd'),
        weight,
        bodyFat,
        bodyWater,
        muscle,
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
      setWeeklyValues((current) => ({ ...current, notes: '' }));
      await loadDashboard(range);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the weekly check-in.');
    } finally {
      setSavingWeekly(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !snapshot ? <StateCard title="Loading body" message="Fetching check-ins and trends." /> : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Daily quick check-in" eyebrow="Weight only">
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <p className="text-sm leading-6 text-muted">Weight with optional notes.</p>
            <InputBlock label="Weight kg">
              <input
                type="number"
                step="0.1"
                min="0"
                value={quickWeight}
                onChange={(event) => setQuickWeight(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
              />
            </InputBlock>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputBlock label="Energy 1-5">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="1"
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
                  value={quickSleep}
                  onChange={(event) => setQuickSleep(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Soreness 1-5">
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  value={quickSoreness}
                  onChange={(event) => setQuickSoreness(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
            </div>
            <InputBlock label="Optional notes">
              <textarea
                value={quickNotes}
                onChange={(event) => setQuickNotes(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-teal outline-none"
              />
            </InputBlock>
            <button
              type="button"
              onClick={() => void handleQuickCheckin()}
              disabled={savingQuick}
              className="fd-button-accent px-5 disabled:opacity-60"
            >
              {savingQuick ? 'Saving...' : 'Save daily check-in'}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Weekly full check-in"
          eyebrow="Core scale metrics"
          action={
            <button
              type="button"
              onClick={() => setWeeklyExpanded((current) => !current)}
              className="fd-button-secondary min-h-11 px-4"
            >
              {weeklyExpanded ? 'Hide weekly scan' : 'Open weekly scan'}
            </button>
          }
        >
          {!weeklyExpanded ? (
            <StateCard
              title="Weekly scan collapsed"
              message="Open this when you want to log body fat %, body water %, muscle kg, and the extra scale metrics."
            />
          ) : (
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputBlock label="Weight kg">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.weight}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, weight: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Body Fat %">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.bodyFat}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, bodyFat: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Body Water %">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.bodyWater}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, bodyWater: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Muscle kg">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.muscle}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, muscle: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Scale BMR, optional">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={weeklyValues.bmr}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, bmr: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Visceral fat">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.visceralFat}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, visceralFat: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Bone mass kg">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.boneMass}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, boneMass: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Protein %">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.protein}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, protein: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Skeletal muscle mass kg">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.skeletalMuscleMass}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, skeletalMuscleMass: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Subcutaneous fat %">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.subcutaneousFat}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, subcutaneousFat: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Body age">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={weeklyValues.bodyAge}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, bodyAge: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Body type">
                <input
                  type="text"
                  value={weeklyValues.bodyType}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, bodyType: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
              <InputBlock label="Waist cm">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weeklyValues.waistCm}
                  onChange={(event) => setWeeklyValues((current) => ({ ...current, waistCm: event.target.value }))}
                  className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-teal outline-none"
                />
              </InputBlock>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Calculated BMI"
                value={derivedBmi !== null ? derivedBmi.toFixed(1) : 'Waiting'}
                note="Calculated from weight and fixed height."
              />
              <MetricCard
                label="Body fat mass"
                value={derivedBodyFatMass !== null ? `${derivedBodyFatMass.toFixed(1)} kg` : 'Waiting'}
                note="Derived from weight and body fat %."
              />
              <MetricCard
                label="Lean body mass"
                value={derivedLeanBodyMass !== null ? `${derivedLeanBodyMass.toFixed(1)} kg` : 'Waiting'}
                note="Weight minus body fat mass."
              />
              <MetricCard
                label="BMR estimate"
                value={derivedBmr !== null ? `${Math.round(derivedBmr)} kcal` : 'Waiting'}
                note="Estimated automatically. Scale BMR remains optional."
              />
            </div>

            <InputBlock label="Optional notes">
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
              className="fd-button-accent px-5 disabled:opacity-60"
            >
              {savingWeekly ? 'Saving...' : 'Save weekly full check-in'}
            </button>
          </div>
          )}
        </SectionCard>
      </section>

      <SectionCard title="Latest metrics" eyebrow="Trend view">
        <div className="mb-4 xl:hidden">
          <button type="button" onClick={() => setShowLatestMetrics((v) => !v)} className="fd-button-secondary min-h-11 px-4">
            {showLatestMetrics ? 'Hide latest metrics' : 'Show latest metrics'}
          </button>
        </div>
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${showLatestMetrics ? 'grid' : 'hidden xl:grid'}`}>
          {(snapshot?.cards ?? []).map((card) => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={card.value !== null ? `${card.value}${card.unit ? ` ${card.unit}` : ''}` : loading ? '...' : 'No data'}
              note={card.recordedAt ? `Latest: ${card.recordedAt}` : 'Waiting for check-ins'}
              status={card.statusLabel ?? null}
            />
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Calculated metrics" eyebrow="Derived from inputs">
          <div className="mb-4 xl:hidden">
            <button type="button" onClick={() => setShowCalculatedMetrics((v) => !v)} className="fd-button-secondary min-h-11 px-4">
              {showCalculatedMetrics ? 'Hide calculated metrics' : 'Show calculated metrics'}
            </button>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${showCalculatedMetrics ? 'grid' : 'hidden xl:grid'}`}>
            {(snapshot?.calculatedMetrics ?? []).map((metric) => (
              <MetricCard key={metric.key} label={metric.label} value={metric.value} note={metric.note} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Status labels" eyebrow="Trend-first reading">
          <div className="mb-4 xl:hidden">
            <button type="button" onClick={() => setShowStatusLabels((v) => !v)} className="fd-button-secondary min-h-11 px-4">
              {showStatusLabels ? 'Hide status labels' : 'Show status labels'}
            </button>
          </div>
          <div className={`space-y-3 ${showStatusLabels ? 'block' : 'hidden xl:block'}`}>
            {(snapshot?.statusLabels ?? []).map((status) => (
              <div key={status.key} className="rounded-3xl border border-line/70 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-teal">{status.label}</p>
                  <span className={['rounded-full px-3 py-1 text-xs font-semibold', toneClass(status.tone)].join(' ')}>
                    {status.value}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">{status.note}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      {hasChartData ? (
      <SectionCard title="Metric charts" eyebrow="Real Supabase data">
        <div className="mb-4 xl:hidden">
          <button type="button" onClick={() => setShowTrends((v) => !v)} className="fd-button-secondary min-h-11 px-4">
            {showTrends ? 'Hide trends' : 'Show trends'}
          </button>
        </div>
        <div className={showTrends ? 'block' : 'hidden xl:block'}>
        <div className="mb-5 flex flex-wrap gap-2">
          {chartTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setChartMetric(tab.key)}
              className={[
                'min-h-11 rounded-2xl px-4 text-sm font-semibold',
                chartMetric === tab.key ? 'bg-teal text-white' : 'border border-line bg-card text-teal'
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={[
                'min-h-11 rounded-2xl px-4 text-sm font-semibold',
                range === option ? 'bg-gold text-teal' : 'border border-line bg-card text-muted'
              ].join(' ')}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="h-80">
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
            <StateCard title="No chart data" message="Save check-ins to see trend lines." />
          )}
        </div>
        </div>
      </SectionCard>
      ) : null}

      <SectionCard title="Consistency reminder" eyebrow="Best comparison">
        <p className="text-sm leading-6 text-muted">
          For best comparison, measure under similar conditions: morning, after bathroom, before food, using the same scale.
        </p>
      </SectionCard>
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

function MetricCard({ label, value, note, status }: { label: string; value: string; note: string; status?: string | null }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
        {status ? <span className="rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-semibold text-teal">{status}</span> : null}
      </div>
      <p className="mt-2 text-lg font-semibold text-teal">{value}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
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

function toneClass(tone: 'low' | 'standard' | 'high' | 'excellent' | 'info') {
  if (tone === 'excellent') return 'bg-teal text-white';
  if (tone === 'standard') return 'bg-card text-teal border border-line';
  if (tone === 'low') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (tone === 'high') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-card text-teal border border-line';
}
