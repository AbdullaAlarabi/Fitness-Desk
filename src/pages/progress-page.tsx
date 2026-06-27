import { useEffect, useMemo, useState } from 'react';
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
import { Card, DataPanel, LoadingSkeleton, SectionCard, StateCard, StatusTile } from '../components/ui';
import type { BodyMetricKey } from '../services/bodyDashboardService';
import { formatPace, formatRunTime } from '../services/runningServices';
import { getProgressDashboardSummary, type ProgressSummary } from '../services/progressDashboardService';
import { useFitnessDeskState } from '../state/fitnessDeskState';

const bodyTabs: Array<{ key: BodyMetricKey; label: string }> = [
  { key: 'weight', label: 'Weight' },
  { key: 'body_fat', label: 'Body Fat' },
  { key: 'body_water', label: 'Body Water' },
  { key: 'muscle_mass', label: 'Muscle' }
];

export function ProgressPage() {
  const { state: appState } = useFitnessDeskState();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bodyTab, setBodyTab] = useState<BodyMetricKey>('weight');
  const [showTrainingTrend, setShowTrainingTrend] = useState(false);
  const [showIntakeTrend, setShowIntakeTrend] = useState(false);
  const [showBodyTrend, setShowBodyTrend] = useState(false);
  const [showRunTrend, setShowRunTrend] = useState(false);

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

  const sharedProgress = appState.progress;
  const latestRun = summary?.runningSnapshot.latestThreePointTwoKmSeconds ?? null;
  const runChartData =
    summary?.runningSnapshot.runs
      .filter((run) => run.distance_km === 3.2 && typeof run.duration_seconds === 'number')
      .map((run) => ({
        date: run.session_date,
        minutes: Number(((run.duration_seconds ?? 0) / 60).toFixed(2))
      })) ?? [];
  const bodyChartData = summary?.bodySnapshot.series[bodyTab] ?? [];
  const weeklyBars = summary?.weeklyBars ?? [];
  const hasWorkoutBars = weeklyBars.length > 0 && weeklyBars.some((item) => item.workouts > 0);
  const hasIntakeBars = weeklyBars.length > 0 && weeklyBars.some((item) => item.intake > 0);
  const hasBodyTrend = bodyChartData.length > 1;
  const hasRunTrend = runChartData.length > 1;

  const weekSummaryCards = useMemo(
    () => [
      {
        label: 'Sessions completed',
        value: getSessionCompletionValue(appState),
        helper: 'Structured sessions this week.'
      },
      {
        label: 'Intake adherence',
        value: `${sharedProgress.intakeHandledPercent}% handled`,
        helper: `${sharedProgress.intakeTakenPercent}% taken`
      },
      {
        label: 'Weight logged',
        value: appState.body.latestDailyCheckinDate ? 'Yes' : 'No',
        helper: appState.body.latestDailyCheckinDate ? `Latest: ${appState.body.latestDailyCheckinDate}` : 'Not logged yet'
      },
      {
        label: 'Current weight',
        value: typeof appState.body.dailyWeightKg === 'number' ? `${appState.body.dailyWeightKg} kg` : 'Not logged yet',
        helper: 'Latest daily check-in.'
      },
      {
        label: '3.2 km run',
        value: latestRun ? formatRunTime(latestRun) : 'No run logged',
        helper: latestRun ? 'Latest saved result.' : 'Save a run to track pace.'
      }
    ],
    [appState, latestRun, sharedProgress]
  );

  const recommendation = getNextRecommendation(appState, summary);

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      <Card className="space-y-2">
        <p className="fd-label">Progress</p>
        <p className="section-title text-teal">Training, intake, body, and run trends.</p>
      </Card>

      {error ? <ErrorBanner message={error} /> : null}
      {loading && !summary ? <LoadingSkeleton lines={4} /> : null}

      <section className="space-y-4">
        <SectionCard title="This Week" eyebrow="Summary">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {weekSummaryCards.map((card) => (
              <StatusTile key={card.label} label={card.label} value={card.value} helper={card.helper} />
            ))}
          </div>
        </SectionCard>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <SectionCard title="Consistency Score" eyebrow="Big picture">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-gold bg-teal text-2xl font-semibold text-gold shadow-card">
                  {`${sharedProgress.consistencyScore}%`}
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <StatusTile label="Workouts" value={`${sharedProgress.workoutCompletionPercent}%`} />
                  <StatusTile label="Intake" value={`${sharedProgress.intakeHandledPercent}%`} />
                  <StatusTile label="Body" value={`${sharedProgress.bodyCheckinAdherencePercent}%`} />
                </div>
              </div>
              <p className="text-sm text-muted">Based on workouts, intake, and body check-ins this week.</p>
            </div>
          </SectionCard>

          <SectionCard title="What to do next" eyebrow="Practical">
            <div className="space-y-3">
              <p className="card-title text-teal">{recommendation.title}</p>
              <p className="text-sm leading-6 text-muted">{recommendation.message}</p>
            </div>
          </SectionCard>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <DataPanel
            title="Weight trend"
            subtitle="Latest movement in scale weight."
            actions={
              <button type="button" onClick={() => setShowBodyTrend((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                {showBodyTrend ? 'Hide' : 'View'}
              </button>
            }
            empty={!hasBodyTrend ? <StateCard title="Log more check-ins to build this trend." message="A single entry is enough for latest value, but not enough for a trend line." /> : undefined}
          >
            {hasBodyTrend && showBodyTrend ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {bodyTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setBodyTab(tab.key)}
                      className={[
                        'min-h-10 rounded-2xl px-4 text-sm font-semibold',
                        bodyTab === tab.key ? 'bg-teal text-white' : 'border border-line bg-card text-teal'
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bodyChartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                      <XAxis dataKey="date" stroke="#96998C" />
                      <YAxis stroke="#96998C" />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#061414" strokeWidth={3} dot={{ fill: '#BCFF00', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : hasBodyTrend ? (
              <p className="text-sm text-muted">Open this panel to view the current body trend.</p>
            ) : null}
          </DataPanel>

          <DataPanel
            title="Training consistency"
            subtitle="Weekly structured-session completion."
            actions={
              <button type="button" onClick={() => setShowTrainingTrend((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                {showTrainingTrend ? 'Hide' : 'View'}
              </button>
            }
            empty={!hasWorkoutBars ? <StateCard title="No workout trend yet." message="Complete more sessions to build the weekly trend." /> : undefined}
          >
            {hasWorkoutBars && showTrainingTrend ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyBars} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                    <XAxis dataKey="week" stroke="#96998C" />
                    <YAxis stroke="#96998C" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="workouts" fill="#061414" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : hasWorkoutBars ? (
              <p className="text-sm text-muted">Open this panel to view the training trend.</p>
            ) : null}
          </DataPanel>

          <DataPanel
            title="Intake adherence"
            subtitle="Handled intake logs across recent weeks."
            actions={
              <button type="button" onClick={() => setShowIntakeTrend((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                {showIntakeTrend ? 'Hide' : 'View'}
              </button>
            }
            empty={!hasIntakeBars ? <StateCard title="No intake trend yet." message="Handle more intake items to build the weekly trend." /> : undefined}
          >
            {hasIntakeBars && showIntakeTrend ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyBars} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                    <XAxis dataKey="week" stroke="#96998C" />
                    <YAxis stroke="#96998C" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="intake" fill="#BCFF00" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : hasIntakeBars ? (
              <p className="text-sm text-muted">Open this panel to view the intake trend.</p>
            ) : null}
          </DataPanel>

          <DataPanel
            title="Run performance"
            subtitle="3.2 km results and pace movement."
            actions={
              <button type="button" onClick={() => setShowRunTrend((current) => !current)} className="fd-button-secondary min-h-10 px-4">
                {showRunTrend ? 'Hide' : 'View'}
              </button>
            }
            empty={!hasRunTrend ? <StateCard title="No run trend yet." message="Log more than one 3.2 km run to build this trend." /> : undefined}
          >
            {hasRunTrend && showRunTrend ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatusTile label="Current best" value={formatRunTime(summary?.runningSnapshot.bestThreePointTwoKmSeconds ?? 1200)} />
                  <StatusTile label="Latest 3.2 km" value={latestRun ? formatRunTime(latestRun) : 'No run logged'} />
                  <StatusTile label="Current pace" value={formatPace(summary?.runningSnapshot.currentPaceSecondsPerKm ?? 375)} />
                  <StatusTile label="Target pace" value={formatPace(summary?.runningSnapshot.targetPaceSecondsPerKm ?? 281)} />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={runChartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(6,20,20,0.12)" strokeDasharray="4 4" />
                      <XAxis dataKey="date" stroke="#96998C" />
                      <YAxis stroke="#96998C" domain={[14, 20.5]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="minutes" stroke="#061414" strokeWidth={3} dot={{ fill: '#BCFF00', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : hasRunTrend ? (
              <p className="text-sm text-muted">Open this panel to view the run trend.</p>
            ) : null}
          </DataPanel>
        </div>

        <div className="space-y-4">
          <SectionCard title="What changed" eyebrow="Latest signals">
            <div className="grid gap-3">
              <StatusTile label="Weekly summary" value={sharedProgress.weeklySummary} />
              <StatusTile label="Monthly summary" value={sharedProgress.monthlySummary} />
              <StatusTile label="Current weight" value={typeof appState.body.dailyWeightKg === 'number' ? `${appState.body.dailyWeightKg} kg` : 'Not logged yet'} />
              <StatusTile label="Next run test" value={summary?.runningSnapshot.nextTestDate ?? '--'} />
            </div>
          </SectionCard>

          <SectionCard title="Monthly snapshot" eyebrow="Simple view">
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted">Consistency uses the same workout, intake, and body check-in logic shown in Today and Progress.</p>
              <p className="text-sm leading-6 text-muted">Score split: workouts 50%, intake 30%, body 20%.</p>
              <p className="text-sm leading-6 text-muted">
                3.2 km baseline: {formatRunTime(summary?.runningSnapshot.baselineThreePointTwoKmSeconds ?? 1200)}.
                Target: {formatRunTime(summary?.runningSnapshot.targetThreePointTwoKmSeconds ?? 900)}.
              </p>
            </div>
          </SectionCard>
        </div>
      </section>
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

function getSessionCompletionValue(state: ReturnType<typeof useFitnessDeskState>['state']) {
  const structuredDays = state.weeklyPlan.filter((day) => day.type === 'structured');
  const completed = structuredDays.filter((day) => day.status === 'completed').length;
  return `${completed}/${structuredDays.length}`;
}

function getNextRecommendation(
  state: ReturnType<typeof useFitnessDeskState>['state'],
  summary: ProgressSummary | null
) {
  const intakeItems = state.intakeGroups.flatMap((group) => group.items);
  const protein = intakeItems.find((item) => item.name.toLowerCase().includes('protein'));
  const creatine = intakeItems.find((item) => item.name.toLowerCase().includes('creatine'));
  const postWorkoutIncomplete = [protein, creatine].some((item) => item && item.status !== 'taken');
  const weeklyBodyFat = summary?.bodySnapshot.cards.find((card) => card.key === 'body_fat')?.value ?? null;

  if (state.currentSession.status !== 'completed' && !state.currentSession.isRest) {
    return {
      title: `Start today’s ${state.currentSession.title} session.`,
      message: 'Training is still open. Finish the session before moving on to intake and body metrics.'
    };
  }

  if (state.currentSession.status === 'completed' && postWorkoutIncomplete) {
    return {
      title: 'Finish Protein and Creatine.',
      message: 'The session is complete. Close out post-workout intake next.'
    };
  }

  if (state.body.dailyWeightKg === null) {
    return {
      title: 'Log today’s weight.',
      message: 'The daily weight check-in is still open.'
    };
  }

  if (weeklyBodyFat === null) {
    return {
      title: 'Run weekly scan on your next check-in.',
      message: 'Weight is logged, but the full body scan still needs a weekly entry.'
    };
  }

  return {
    title: `Next up: ${state.nextSession.title}.`,
    message: 'The current day is handled. Review the next session and keep the streak clean.'
  };
}
