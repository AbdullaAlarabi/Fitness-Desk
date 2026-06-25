import { useEffect, useState } from 'react';
import { DatabaseZap, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  AccentButton,
  Card,
  PageHeader,
  Pill,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StateCard
} from '../components/ui';
import { appSettings, profileSettings, scaleSettings } from '../data/settings';
import {
  exportDataset,
  getExportCounts,
  type ExportDatasetKey,
  type ExportFormat
} from '../services/exportService';
import { getSeedSummary, seedInitialFitnessDeskData, type SeedSummary } from '../services/seedInitialData';

export function SeedPage() {
  const [summary, setSummary] = useState<SeedSummary | null>(null);
  const [exportCounts, setExportCounts] = useState<Record<ExportDatasetKey, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [exportMessage, setExportMessage] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');
  const [activeExport, setActiveExport] = useState<string>('');

  useEffect(() => {
    void loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    setError('');

    try {
      const [next, counts] = await Promise.all([getSeedSummary(), getExportCounts()]);
      setSummary(next);
      setExportCounts(counts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load seed status.');
    } finally {
      setLoading(false);
    }
  }

  async function runSeed() {
    setRunning(true);
    setError('');
    setMessage('');

    try {
      const next = await seedInitialFitnessDeskData();
      setSummary(next);
      setExportCounts(await getExportCounts());
      setMessage('Seed complete. Existing rows were preserved and missing rows were inserted once.');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Seed run failed.');
    } finally {
      setRunning(false);
    }
  }

  async function runExport(dataset: ExportDatasetKey, format: ExportFormat) {
    const exportKey = `${dataset}:${format}`;
    setActiveExport(exportKey);
    setExportMessage('');
    setExportError('');

    try {
      const count = await exportDataset(dataset, format);
      setExportMessage(
        `${format.toUpperCase()} export ready for ${dataset.replace(/_/g, ' ')}. Rows exported: ${count}.`
      );
      setExportCounts(await getExportCounts());
    } catch (runError) {
      setExportError(runError instanceof Error ? runError.message : 'Export failed.');
    } finally {
      setActiveExport('');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin console"
        title="Settings, seed, and export"
        description="Personal configuration, one-time setup, and clean exports for Fitness Desk V1."
        action={<Pill>No login · No dark mode · Fixed workspace</Pill>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Profile settings" eyebrow="Personal defaults">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingValue label="Sex" value={profileSettings.sex} />
            <SettingValue label="Age" value={`${profileSettings.age}`} />
            <SettingValue label="Height" value={`${profileSettings.heightCm} cm`} />
            <SettingValue label="Starting weight" value={`${profileSettings.startingWeightKg} kg`} />
            <SettingValue label="Run target" value={formatSeconds(profileSettings.goalRunSeconds)} />
            <SettingValue label="Scale units" value={`${scaleSettings.units.weight} / ${scaleSettings.units.waist}`} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="fd-label">Surgery history note</p>
              <p className="mt-2 text-base font-medium text-teal">{profileSettings.surgeryHistoryNote}</p>
            </Card>
            <Card>
              <p className="fd-label">Goal summary</p>
              <p className="mt-2 text-base font-medium text-teal">{profileSettings.goalRunSummary}</p>
            </Card>
          </div>
        </SectionCard>

        <SectionCard title="Scale and app settings" eyebrow="Locked V1 rules">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingValue label="Scale brand" value={scaleSettings.scaleBrand} />
            <SettingValue label="Weight unit" value={scaleSettings.units.weight} />
            <SettingValue label="Waist unit" value={scaleSettings.units.waist} />
            <SettingValue label="Dark mode" value={appSettings.darkModeEnabled ? 'Enabled' : 'Disabled in V1'} />
          </div>
          <StateCard
            title="Tracking context only"
            message="Fitness Desk stores user-entered training and body data only. There is no auth flow, no medical advice, and no service role key in the app."
          />
        </SectionCard>
      </div>

      <SectionCard title="Seed status" eyebrow="Static setup">
        <div className="flex flex-col gap-4 rounded-3xl border border-line/70 bg-cream/55 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">Workspace: {summary?.workspaceId ?? 'abdulla-fitness-desk'}</p>
            <p className="mt-2 text-sm text-muted">
              This seeds profile support data, intake items, templates, and exercise structure without duplicating existing rows.
            </p>
          </div>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => void loadSummary()} className="inline-flex min-h-12 items-center justify-center gap-2 px-5">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </SecondaryButton>
            <AccentButton onClick={() => void runSeed()} disabled={running} className="inline-flex min-h-12 items-center justify-center gap-2 px-5 disabled:opacity-60">
              <DatabaseZap className="h-4 w-4" />
              {running ? 'Seeding...' : 'Run seed once'}
            </AccentButton>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
      </SectionCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SeedStatCard
          title="Body metrics"
          loading={loading}
          existing={summary?.bodyMetricDefinitions.existing ?? 0}
          target={summary?.bodyMetricDefinitions.totalTarget ?? 19}
          inserted={summary?.bodyMetricDefinitions.inserted ?? 0}
        />
        <SeedStatCard
          title="Intake items"
          loading={loading}
          existing={summary?.intakeItems.existing ?? 0}
          target={summary?.intakeItems.totalTarget ?? 8}
          inserted={summary?.intakeItems.inserted ?? 0}
        />
        <SeedStatCard
          title="Weekly templates"
          loading={loading}
          existing={summary?.workoutTemplates.existing ?? 0}
          target={summary?.workoutTemplates.totalTarget ?? 7}
          inserted={summary?.workoutTemplates.inserted ?? 0}
        />
        <SeedStatCard
          title="Template exercises"
          loading={loading}
          existing={summary?.templateExercises.existing ?? 0}
          target={summary?.templateExercises.totalTarget ?? 0}
          inserted={summary?.templateExercises.inserted ?? 0}
        />
      </div>

      <SectionCard title="Seed contents" eyebrow="What this route seeds">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="fd-label">Weekly split</p>
            <p className="mt-2 text-sm leading-6 text-teal">
              Day 1 Push, Day 2 Pull, Day 3 Legs + Core + Run Intervals, Day 4 Rest / Walking, Day 5 Upper Shape,
              Day 6 3.2 km Run + Arms/Core, Day 7 Rest / Walking.
            </p>
          </Card>
          <Card>
            <p className="fd-label">Workout templates</p>
            <p className="mt-2 text-sm leading-6 text-teal">
              Machine-based exercise templates for Push, Pull, Legs, Upper Shape, and Day 6 arms/core support.
            </p>
          </Card>
          <Card>
            <p className="fd-label">Intake defaults</p>
            <p className="mt-2 text-sm leading-6 text-teal">
              Morning: Biotin, Multivitamin, Omega-3. Afternoon: Ashwagandha, Zinc. Night: Magnesium. Post-workout:
              Protein, Creatine.
            </p>
          </Card>
          <Card>
            <p className="fd-label">User profile defaults</p>
            <p className="mt-2 text-sm leading-6 text-teal">
              Male, 30, 167 cm, 64 kg, sleeve gastrectomy 2019 context, and 3.2 km target from 20:00 to 15:00.
            </p>
          </Card>
        </div>
      </SectionCard>

      <SectionCard title="Exports" eyebrow="Client-side download">
        <div className="grid gap-4 lg:grid-cols-2">
          {EXPORT_DATASETS.map((dataset) => (
            <Card key={dataset.key} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="fd-label">{dataset.label}</p>
                  <p className="mt-2 text-sm text-muted">{dataset.note}</p>
                </div>
                <Pill>{exportCounts?.[dataset.key] ?? 0} rows</Pill>
              </div>
              <div className="flex flex-wrap gap-3">
                <PrimaryButton
                  onClick={() => void runExport(dataset.key, 'json')}
                  disabled={activeExport.length > 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 px-5 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {activeExport === `${dataset.key}:json` ? 'Preparing JSON...' : 'Export JSON'}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => void runExport(dataset.key, 'csv')}
                  disabled={activeExport.length > 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 px-5 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {activeExport === `${dataset.key}:csv` ? 'Preparing CSV...' : 'Export CSV'}
                </SecondaryButton>
              </div>
            </Card>
          ))}
        </div>

        {exportMessage ? <p className="mt-4 text-sm font-medium text-teal">{exportMessage}</p> : null}
        {exportError ? <p className="mt-4 text-sm font-medium text-red-700">{exportError}</p> : null}
      </SectionCard>

      <SectionCard title="Final QA checklist" eyebrow="V1 readiness">
        <div className="grid gap-4 lg:grid-cols-2">
          {QA_ITEMS.map((item) => (
            <Card key={item.title} className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-gold" />
              <div>
                <p className="fd-label">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

const EXPORT_DATASETS: Array<{ key: ExportDatasetKey; label: string; note: string }> = [
  { key: 'daily_checkins', label: 'Daily check-ins', note: 'Weight and daily readiness entries.' },
  { key: 'weekly_body_scans', label: 'Weekly body scans', note: 'Scale metrics and weekly notes.' },
  { key: 'workout_logs', label: 'Workout logs', note: 'Session outcomes, exercise counts, and set volume.' },
  { key: 'intake_logs', label: 'Intake logs', note: 'Taken and skipped supplement or nutrition entries.' },
  { key: 'run_tests', label: 'Run tests', note: '3.2 km run history and target pace data.' }
];

const QA_ITEMS = [
  { title: 'Build and type check', description: 'Run lint and build before deployment to confirm route, data, and PWA changes compile cleanly.' },
  { title: 'iPhone layout', description: 'Check touch targets, bottom navigation reach, export buttons, and form spacing in Safari and Home Screen mode.' },
  { title: 'MacBook layout', description: 'Check the dashboard grid, chart readability, sidebar states, and compact card spacing in desktop browsers.' },
  { title: 'Supabase flow', description: 'Verify seed, intake logging, body check-ins, workout saves, running saves, and exports all use the fixed workspace_id.' }
];

function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="fd-label">{label}</p>
      <p className="mt-2 text-lg font-semibold text-teal">{value}</p>
    </Card>
  );
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function SeedStatCard({
  title,
  loading,
  existing,
  target,
  inserted
}: {
  title: string;
  loading: boolean;
  existing: number;
  target: number;
  inserted: number;
}) {
  return (
    <section className="rounded-panel border border-line/80 bg-card p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal/70">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-teal">{loading ? '...' : `${existing}/${target}`}</p>
      <p className="mt-2 text-sm text-muted">Inserted this run: {inserted}</p>
    </section>
  );
}
