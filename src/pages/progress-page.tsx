import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart
} from 'recharts';
import { SectionCard, StateCard } from '../components/ui';
import type { BodyMetricKey } from '../services/bodyDashboardService';
import { formatPace, formatRunTime } from '../services/runningServices';
import { getProgressDashboardSummary, type ProgressSummary } from '../services/progressDashboardService';

const bodyTabs: Array<{ key: BodyMetricKey; label: string }> = [
  { key: 'weight', label: 'Weight' },
  { key: 'body_fat', label: 'Body Fat' },
  { key: 'body_water', label: 'Body Water' },
  { key: 'muscle_mass', label: 'Muscle' }
];

export function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bodyTab, setBodyTab] = useState<BodyMetricKey>('weight');

  useEffect(() => {
    void loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const next = await getProgressDashboardSummary();
      setSummary(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load progress.');
    } finally {
      setLoading(false);
    }
  }

  const runChartData =
    summary?.runningSnapshot.runs
      .filter((run) => run.distance_km === 3.2 && typeof run.duration_seconds === 'number')
      .map((run) => ({
        date: run.session_date,
        minutes: Number(((run.duration_seconds ?? 0) / 60).toFixed(2))
      })) ?? [];

  const bodyChartData = summary?.bodySnapshot.series[bodyTab] ?? [];
  const hasWeeklyBarData = (summary?.weeklyBars.length ?? 0) > 0;
  const hasBodyChartData = bodyChartData.length > 1;
  const hasRunChartData = runChartData.length > 1;

  return (
    <div className="space-y-6">
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !summary ? <StateCard title="Loading progress" message="Fetching summary and trends." /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Consistency Score" eyebrow="Big picture">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-gold bg-teal text-3xl font-semibold text-gold shadow-card">
              {loading ? '...' : `${summary?.consistencyScore ?? 0}%`}
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <MetricCard label="Workout completion" value={`${summary?.workoutCompletionPercent ?? 0}%`} />
              <MetricCard label="Intake adherence" value={`${summary?.intakeAdherencePercent ?? 0}%`} />
              <MetricCard label="Body check-ins" value={`${summary?.bodyCheckinAdherencePercent ?? 0}%`} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Weekly summary" eyebrow="This week">
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <p className="text-sm leading-6 text-muted">{summary?.weeklySummary ?? 'Loading summary...'}</p>
            <p className="text-sm leading-6 text-muted">{summary?.monthlySummary ?? 'Loading summary...'}</p>
          </div>
        </SectionCard>
      </section>

      {hasWeeklyBarData ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Workout completion this week" eyebrow="Weekly bar chart">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.weeklyBars ?? []} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                  <XAxis dataKey="week" stroke="#96998C" />
                  <YAxis stroke="#96998C" domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="#061414" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Intake adherence" eyebrow="Weekly bar chart">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary?.weeklyBars ?? []} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                  <XAxis dataKey="week" stroke="#96998C" />
                  <YAxis stroke="#96998C" domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="intake" fill="#BCFF00" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </section>
      ) : null}

      <SectionCard title="Body trends" eyebrow="Metric lines">
        <div className="mb-5 flex flex-wrap gap-2">
          {bodyTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBodyTab(tab.key)}
              className={[
                'min-h-11 rounded-2xl px-4 text-sm font-semibold',
                bodyTab === tab.key ? 'bg-teal text-white' : 'border border-line bg-card text-teal'
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-80">
          {hasBodyChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyChartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#96998C" />
                <YAxis stroke="#96998C" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#061414" strokeWidth={3} dot={{ fill: '#BCFF00', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <StateCard title="Not enough body data" message="Trend charts appear after more check-ins are saved." />
          )}
        </div>
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Running 3.2 km progress" eyebrow="Goal tracking">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Current best"
              value={loading ? '...' : formatRunTime(summary?.runningSnapshot.bestThreePointTwoKmSeconds ?? 1200)}
            />
            <MetricCard
              label="Latest 3.2 km"
              value={loading ? '...' : formatRunTime(summary?.runningSnapshot.latestThreePointTwoKmSeconds ?? 1200)}
            />
            <MetricCard
              label="Target pace"
              value={loading ? '...' : formatPace(summary?.runningSnapshot.targetPaceSecondsPerKm ?? 281)}
            />
            <MetricCard
              label="Progress"
              value={loading ? '...' : `${summary?.runningSnapshot.progressPercent ?? 0}%`}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Current pace"
              value={loading ? '...' : formatPace(summary?.runningSnapshot.currentPaceSecondsPerKm ?? 375)}
            />
            <MetricCard
              label="Current speed"
              value={loading ? '...' : `${summary?.runningSnapshot.latestSpeedKmh?.toFixed(1) ?? '9.6'} km/h`}
            />
            <MetricCard
              label="Target speed"
              value={loading ? '...' : `${summary?.runningSnapshot.targetSpeedKmh?.toFixed(1) ?? '12.8'} km/h`}
            />
            <MetricCard
              label="Next test"
              value={loading ? '...' : summary?.runningSnapshot.nextTestDate ?? '--'}
            />
          </div>
          <div className="mt-5 h-72">
            {hasRunChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={runChartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" stroke="#96998C" />
                  <YAxis stroke="#96998C" domain={[14, 20.5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="minutes" stroke="#061414" strokeWidth={3} dot={{ fill: '#BCFF00', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <StateCard title="Not enough run data" message="Log more than one 3.2 km run to unlock the trend chart." />
            )}
          </div>
        </SectionCard>

        <SectionCard title="6-month target line" eyebrow="20:00 to 15:00">
          <div className="space-y-3 rounded-3xl border border-line/70 bg-white p-5">
            {(summary?.runningSnapshot.milestones ?? []).map((milestone) => (
              <div key={milestone.month} className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 text-sm">
                <span className="font-semibold text-teal">{milestone.month}</span>
                <span className="text-muted">
                  {formatRunTime(milestone.minSeconds)}-{formatRunTime(milestone.maxSeconds)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Run test history" eyebrow="Saved 3.2 km entries">
          <div className="space-y-3">
            {(summary?.runningSnapshot.runs ?? [])
              .filter((run) => run.distance_km === 3.2 && typeof run.duration_seconds === 'number')
              .slice()
              .reverse()
              .slice(0, 6)
              .map((run) => (
                <div key={run.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-teal">{run.session_date}</p>
                    <p className="text-sm text-muted">{formatRunType(run.run_type)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <span className="text-teal">{formatRunTime(run.duration_seconds ?? 0)}</span>
                    <span className="text-teal">{run.pace_seconds_per_km ? formatPace(run.pace_seconds_per_km) : '--'}</span>
                    <span className="text-teal">{typeof run.treadmill_speed_kmh === 'number' ? `${run.treadmill_speed_kmh.toFixed(1)} km/h` : '--'}</span>
                  </div>
                </div>
              ))}
            {summary?.runningSnapshot.runs.filter((run) => run.distance_km === 3.2).length === 0 ? (
              <StateCard title="No run tests" message="Save a 3.2 km run to build the history." />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Monthly snapshot" eyebrow="Simple view">
          <div className="space-y-4 rounded-3xl border border-line/70 bg-white p-5">
            <p className="text-sm leading-6 text-muted">Workout carries the most weight, followed by intake, then body check-ins.</p>
            <p className="text-sm leading-6 text-muted">Score split: 50 / 30 / 20.</p>
            <p className="text-sm leading-6 text-muted">
              3.2 km baseline: {formatRunTime(summary?.runningSnapshot.baselineThreePointTwoKmSeconds ?? 1200)}.
              Target: {formatRunTime(summary?.runningSnapshot.targetThreePointTwoKmSeconds ?? 900)}.
            </p>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-teal">{value}</p>
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

function formatRunType(runType: string) {
  if (runType === 'controlled_3_2km') return 'Controlled 3.2 km';
  if (runType === 'time_trial_3_2km') return '3.2 km test';
  if (runType === 'tempo') return 'Tempo';
  if (runType === 'interval') return 'Intervals';
  return runType;
}
