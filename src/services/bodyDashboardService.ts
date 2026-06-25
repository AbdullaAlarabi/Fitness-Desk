import { format, subDays } from 'date-fns';
import { profile } from '../data/seed';
import { emitDashboardRefresh } from '../lib/dashboardEvents';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { BodyCheckinRow, BodyMetricDefinitionRow, BodyMetricValueRow } from '../types/database';

export type BodyMetricKey = 'weight' | 'body_fat' | 'body_water' | 'muscle_mass';
export type BodyRangeFilter = '7D' | '30D' | '90D' | 'All';

export type BodyMetricCard = {
  key: BodyMetricKey;
  label: string;
  unit: string | null;
  value: number | null;
  recordedAt: string | null;
  statusLabel?: string | null;
};

export type BodyChartPoint = {
  date: string;
  value: number;
};

export type BodyCalculatedMetric = {
  key: string;
  label: string;
  value: string;
  note: string;
};

export type BodyStatusLabel = {
  key: string;
  label: string;
  value: string;
  tone: 'low' | 'standard' | 'high' | 'excellent' | 'info';
  note: string;
};

export type BodyDailySnapshot = {
  weight: number | null;
  energyLevel: number | null;
  sleepHours: number | null;
  sorenessLevel: number | null;
  notes: string | null;
};

export type BodyDashboardSnapshot = {
  metricDefinitions: BodyMetricDefinitionRow[];
  cards: BodyMetricCard[];
  series: Record<BodyMetricKey, BodyChartPoint[]>;
  calculatedMetrics: BodyCalculatedMetric[];
  statusLabels: BodyStatusLabel[];
  latestDaily: BodyDailySnapshot | null;
};

export type WeeklyFullCheckinInput = {
  checkinDate: string;
  notes?: string | null;
  weight: number;
  bodyFat: number;
  bodyWater: number;
  muscle: number;
  bmi?: number | null;
  bmr?: number | null;
  visceralFat?: number | null;
  boneMass?: number | null;
  protein?: number | null;
  skeletalMuscleMass?: number | null;
  subcutaneousFat?: number | null;
  bodyAge?: number | null;
  bodyType?: string | null;
  waistCm?: number | null;
  additionalMetrics?: Array<{ metricDefinitionId: string; numericValue?: number | null; textValue?: string | null }>;
};

export async function getBodyDashboardSnapshot(range: BodyRangeFilter): Promise<BodyDashboardSnapshot> {
  const client = getSupabaseClient();
  const [definitionsResult, checkinsResult, valuesResult] = await Promise.all([
    client.from('body_metric_definitions').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true).order('position'),
    client.from('body_checkins').select('*').eq('workspace_id', WORKSPACE_ID).order('checkin_date'),
    client.from('body_metric_values').select('*').eq('workspace_id', WORKSPACE_ID).order('created_at')
  ]);

  if (definitionsResult.error) throw definitionsResult.error;
  if (checkinsResult.error) throw checkinsResult.error;
  if (valuesResult.error) throw valuesResult.error;

  const definitions = (definitionsResult.data as BodyMetricDefinitionRow[]) ?? [];
  const checkins = (checkinsResult.data as BodyCheckinRow[]) ?? [];
  const values = (valuesResult.data as BodyMetricValueRow[]) ?? [];

  const filteredCheckins = applyRangeFilter(checkins, range);
  const checkinMap = new Map(filteredCheckins.map((checkin) => [checkin.id, checkin]));
  const filteredValues = values.filter((value) => checkinMap.has(value.body_checkin_id));

  const cards = buildMetricCards(definitions, checkins, values);
  const series = buildMetricSeries(definitions, filteredCheckins, filteredValues);
  const calculatedMetrics = buildCalculatedMetrics(definitions, checkins, values);
  const statusLabels = buildStatusLabels(definitions, checkins, values);
  const latestDaily = buildLatestDailySnapshot(definitions, checkins, values);

  return {
    metricDefinitions: definitions,
    cards,
    series,
    calculatedMetrics,
    statusLabels,
    latestDaily
  };
}

export async function saveDailyQuickCheckin(input: {
  checkinDate: string;
  weight: number;
  energyLevel?: number | null;
  sleepHours?: number | null;
  sorenessLevel?: number | null;
  notes?: string | null;
}) {
  return upsertCheckin({
    checkinDate: input.checkinDate,
    checkinType: 'daily',
    notes: input.notes ?? null,
    metrics: [
      { key: 'weight', numericValue: input.weight },
      { key: 'energy_level', numericValue: input.energyLevel ?? null },
      { key: 'sleep_hours', numericValue: input.sleepHours ?? null },
      { key: 'soreness_level', numericValue: input.sorenessLevel ?? null }
    ]
  });
}

export async function saveWeeklyFullCheckin(input: WeeklyFullCheckinInput) {
  const metrics = [
    { key: 'weight', numericValue: input.weight },
    { key: 'body_fat', numericValue: input.bodyFat },
    { key: 'body_water', numericValue: input.bodyWater },
    { key: 'muscle_mass', numericValue: input.muscle },
    { key: 'bmi', numericValue: input.bmi ?? calculateBmi(input.weight) },
    { key: 'bmr', numericValue: input.bmr ?? calculateBmr(input.weight) },
    { key: 'visceral_fat', numericValue: input.visceralFat ?? null },
    { key: 'bone_mass', numericValue: input.boneMass ?? null },
    { key: 'protein', numericValue: input.protein ?? null },
    { key: 'skeletal_muscle_mass', numericValue: input.skeletalMuscleMass ?? null },
    { key: 'subcutaneous_mass', numericValue: input.subcutaneousFat ?? null },
    { key: 'body_age', numericValue: input.bodyAge ?? null },
    { key: 'waist_cm', numericValue: input.waistCm ?? null },
    { key: 'body_fat_mass', numericValue: calculateBodyFatMass(input.weight, input.bodyFat) },
    { key: 'lean_body_mass', numericValue: calculateLeanBodyMass(input.weight, input.bodyFat) }
  ];

  return upsertCheckin({
    checkinDate: input.checkinDate,
    checkinType: 'weekly',
    notes: input.notes ?? null,
    metrics,
    textMetrics: [{ key: 'body_type', textValue: input.bodyType ?? null }],
    additionalMetrics: input.additionalMetrics
  });
}

export function calculateBmi(weightKg: number) {
  const heightMeters = profile.heightCm / 100;
  return roundMetric(weightKg / (heightMeters * heightMeters));
}

export function calculateBodyFatMass(weightKg: number, bodyFatPct: number) {
  return roundMetric(weightKg * (bodyFatPct / 100));
}

export function calculateLeanBodyMass(weightKg: number, bodyFatPct: number) {
  return roundMetric(weightKg - calculateBodyFatMass(weightKg, bodyFatPct));
}

export function calculateBmr(weightKg: number) {
  return roundMetric(10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5);
}

function applyRangeFilter(checkins: BodyCheckinRow[], range: BodyRangeFilter) {
  if (range === 'All') return checkins;

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
  return checkins.filter((checkin) => checkin.checkin_date >= cutoff);
}

function buildMetricCards(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
): BodyMetricCard[] {
  const cardKeys: BodyMetricKey[] = ['weight', 'body_fat', 'body_water', 'muscle_mass'];
  const latestCheckins = [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));

  return cardKeys.map((key) => {
    const definition = definitions.find((item) => item.key === key) ?? null;
    if (!definition) {
      return { key, label: key, unit: null, value: null, recordedAt: null };
    }

    const latest = latestCheckins
      .map((checkin) => ({
        checkin,
        value: values.find((item) => item.body_checkin_id === checkin.id && item.metric_definition_id === definition.id)
      }))
      .find((entry) => typeof entry.value?.numeric_value === 'number');

    const numericValue = latest?.value?.numeric_value ?? null;

    return {
      key,
      label: definition.label,
      unit: definition.unit,
      value: numericValue,
      recordedAt: latest?.checkin.checkin_date ?? null,
      statusLabel: key === 'body_fat'
        ? classifyBodyFat(numericValue)
        : key === 'body_water'
          ? classifyWater(numericValue)
          : key === 'weight'
            ? classifyBmi(calculateBmiFromLatest(definitions, checkins, values))
            : null
    };
  });
}

function buildMetricSeries(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
): Record<BodyMetricKey, BodyChartPoint[]> {
  const cardKeys: BodyMetricKey[] = ['weight', 'body_fat', 'body_water', 'muscle_mass'];

  return cardKeys.reduce(
    (acc, key) => {
      const definition = definitions.find((item) => item.key === key);
      if (!definition) {
        acc[key] = [];
        return acc;
      }

      acc[key] = checkins
        .map((checkin) => {
          const value = values.find(
            (item) => item.body_checkin_id === checkin.id && item.metric_definition_id === definition.id
          );
          return typeof value?.numeric_value === 'number'
            ? { date: checkin.checkin_date, value: value.numeric_value }
            : null;
        })
        .filter((item): item is BodyChartPoint => item !== null);

      return acc;
    },
    {} as Record<BodyMetricKey, BodyChartPoint[]>
  );
}

function buildCalculatedMetrics(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
) {
  const latestWeekly = [...checkins]
    .filter((checkin) => checkin.checkin_type === 'weekly')
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0] ?? null;

  const latestWeight = getLatestNumericMetric(definitions, checkins, values, 'weight');
  const latestBodyFat = getLatestNumericMetric(definitions, checkins, values, 'body_fat');
  const latestBmr = getLatestNumericMetric(definitions, checkins, values, 'bmr');
  const latestBmi = getLatestNumericMetric(definitions, checkins, values, 'bmi');
  const weeklyAverage = calculateAverageWeight(checkins, values, definitions, 7);
  const weeklyChange = calculateWeightChange(checkins, values, definitions, 7);
  const monthlyChange = calculateWeightChange(checkins, values, definitions, 30);

  return [
    {
      key: 'bmi',
      label: 'BMI',
      value: formatMetricValue(latestBmi ?? (latestWeight ? calculateBmi(latestWeight) : null)),
      note: 'Height fixed at 167 cm.'
    },
    {
      key: 'body_fat_mass',
      label: 'Body Fat Mass',
      value: formatMetricValue(
        latestWeight !== null && latestBodyFat !== null ? calculateBodyFatMass(latestWeight, latestBodyFat) : null,
        'kg'
      ),
      note: 'Derived from weight and body fat %.'
    },
    {
      key: 'lean_body_mass',
      label: 'Lean Body Mass',
      value: formatMetricValue(
        latestWeight !== null && latestBodyFat !== null ? calculateLeanBodyMass(latestWeight, latestBodyFat) : null,
        'kg'
      ),
      note: 'Weight minus body fat mass.'
    },
    {
      key: 'bmr',
      label: 'BMR estimate',
      value: formatMetricValue(latestBmr ?? (latestWeight ? calculateBmr(latestWeight) : null), 'kcal'),
      note: 'Mifflin-St Jeor estimate.'
    },
    {
      key: 'weekly_average_weight',
      label: '7-day average weight',
      value: formatMetricValue(weeklyAverage, 'kg'),
      note: 'Built from daily check-ins.'
    },
    {
      key: 'weekly_weight_change',
      label: 'Weekly weight change',
      value: formatSignedMetric(weeklyChange, 'kg'),
      note: 'Compared with the prior 7-day point.'
    },
    {
      key: 'monthly_weight_change',
      label: 'Monthly weight change',
      value: formatSignedMetric(monthlyChange, 'kg'),
      note: latestWeekly ? `Latest weekly check-in: ${latestWeekly.checkin_date}.` : 'Waiting for weekly entries.'
    }
  ];
}

function buildStatusLabels(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
): BodyStatusLabel[] {
  const latestWeight = getLatestNumericMetric(definitions, checkins, values, 'weight');
  const latestBodyFat = getLatestNumericMetric(definitions, checkins, values, 'body_fat');
  const latestWater = getLatestNumericMetric(definitions, checkins, values, 'body_water');
  const latestVisceralFat = getLatestNumericMetric(definitions, checkins, values, 'visceral_fat');
  const bmi = latestWeight ? calculateBmi(latestWeight) : null;

  return [
    {
      key: 'bmi_status',
      label: 'BMI status',
      value: classifyBmi(bmi),
      tone: classifyToneFromLabel(classifyBmi(bmi)),
      note: 'Use trends, not single readings.'
    },
    {
      key: 'body_fat_status',
      label: 'Body fat status',
      value: classifyBodyFat(latestBodyFat),
      tone: classifyToneFromLabel(classifyBodyFat(latestBodyFat)),
      note: 'Targeted for your physique goal.'
    },
    {
      key: 'water_status',
      label: 'Water status',
      value: classifyWater(latestWater),
      tone: classifyToneFromLabel(classifyWater(latestWater)),
      note: 'Hydration status can fluctuate.'
    },
    {
      key: 'visceral_fat_status',
      label: 'Visceral fat',
      value: latestVisceralFat !== null ? `${latestVisceralFat}` : 'Add scale brand in Settings',
      tone: 'info',
      note: 'Interpretation depends on scale brand.'
    }
  ];
}

function buildLatestDailySnapshot(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
): BodyDailySnapshot | null {
  const latestDaily = [...checkins]
    .filter((checkin) => checkin.checkin_type === 'daily')
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0] ?? null;

  if (!latestDaily) return null;

  return {
    weight: getNumericValueForCheckin(definitions, values, latestDaily.id, 'weight'),
    energyLevel: getNumericValueForCheckin(definitions, values, latestDaily.id, 'energy_level'),
    sleepHours: getNumericValueForCheckin(definitions, values, latestDaily.id, 'sleep_hours'),
    sorenessLevel: getNumericValueForCheckin(definitions, values, latestDaily.id, 'soreness_level'),
    notes: latestDaily.notes
  };
}

async function upsertCheckin(input: {
  checkinDate: string;
  checkinType: 'daily' | 'weekly';
  notes: string | null;
  metrics: Array<{ key: string; numericValue: number | null }>;
  textMetrics?: Array<{ key: string; textValue: string | null }>;
  additionalMetrics?: Array<{ metricDefinitionId: string; numericValue?: number | null; textValue?: string | null }>;
}) {
  const client = getSupabaseClient();

  const [existingCheckinResult, definitionsResult] = await Promise.all([
    client
      .from('body_checkins')
      .select('*')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('checkin_date', input.checkinDate)
      .eq('checkin_type', input.checkinType)
      .maybeSingle(),
    client.from('body_metric_definitions').select('*').eq('workspace_id', WORKSPACE_ID).eq('is_active', true)
  ]);

  if (existingCheckinResult.error) throw existingCheckinResult.error;
  if (definitionsResult.error) throw definitionsResult.error;

  const definitions = (definitionsResult.data as BodyMetricDefinitionRow[]) ?? [];

  let checkin = existingCheckinResult.data as BodyCheckinRow | null;
  if (checkin) {
    const updated = await client
      .from('body_checkins')
      .update({ notes: input.notes })
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', checkin.id)
      .select()
      .single();

    if (updated.error) throw updated.error;
    checkin = updated.data as BodyCheckinRow;
  } else {
    const inserted = await client
      .from('body_checkins')
      .insert({
        workspace_id: WORKSPACE_ID,
        checkin_date: input.checkinDate,
        checkin_type: input.checkinType,
        notes: input.notes
      })
      .select()
      .single();

    if (inserted.error) throw inserted.error;
    checkin = inserted.data as BodyCheckinRow;
  }

  for (const metric of input.metrics) {
    const definition = definitions.find((item) => item.key === metric.key);
    if (!definition) continue;
    await upsertMetricValue({
      bodyCheckinId: checkin.id,
      metricDefinitionId: definition.id,
      numericValue: metric.numericValue,
      textValue: null
    });
  }

  for (const metric of input.textMetrics ?? []) {
    const definition = definitions.find((item) => item.key === metric.key);
    if (!definition) continue;
    await upsertMetricValue({
      bodyCheckinId: checkin.id,
      metricDefinitionId: definition.id,
      numericValue: null,
      textValue: metric.textValue
    });
  }

  for (const metric of input.additionalMetrics ?? []) {
    await upsertMetricValue({
      bodyCheckinId: checkin.id,
      metricDefinitionId: metric.metricDefinitionId,
      numericValue: metric.numericValue ?? null,
      textValue: metric.textValue ?? null
    });
  }

  emitDashboardRefresh();
  return checkin;
}

async function upsertMetricValue(input: {
  bodyCheckinId: string;
  metricDefinitionId: string;
  numericValue: number | null;
  textValue: string | null;
}) {
  const client = getSupabaseClient();
  const existing = await client
    .from('body_metric_values')
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('body_checkin_id', input.bodyCheckinId)
    .eq('metric_definition_id', input.metricDefinitionId)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const updated = await client
      .from('body_metric_values')
      .update({
        numeric_value: input.numericValue,
        text_value: input.textValue
      })
      .eq('workspace_id', WORKSPACE_ID)
      .eq('id', existing.data.id);

    if (updated.error) throw updated.error;
    return;
  }

  const inserted = await client.from('body_metric_values').insert({
    workspace_id: WORKSPACE_ID,
    body_checkin_id: input.bodyCheckinId,
    metric_definition_id: input.metricDefinitionId,
    numeric_value: input.numericValue,
    text_value: input.textValue
  });

  if (inserted.error) throw inserted.error;
}

function getLatestNumericMetric(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[],
  key: string
) {
  const definition = definitions.find((item) => item.key === key);
  if (!definition) return null;
  const latestCheckins = [...checkins].sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  for (const checkin of latestCheckins) {
    const value = values.find((item) => item.body_checkin_id === checkin.id && item.metric_definition_id === definition.id);
    if (typeof value?.numeric_value === 'number') return value.numeric_value;
  }
  return null;
}

function getNumericValueForCheckin(
  definitions: BodyMetricDefinitionRow[],
  values: BodyMetricValueRow[],
  checkinId: string,
  key: string
) {
  const definition = definitions.find((item) => item.key === key);
  if (!definition) return null;
  const value = values.find((item) => item.body_checkin_id === checkinId && item.metric_definition_id === definition.id);
  return typeof value?.numeric_value === 'number' ? value.numeric_value : null;
}

function calculateAverageWeight(
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[],
  definitions: BodyMetricDefinitionRow[],
  days: number
) {
  const weightDefinition = definitions.find((item) => item.key === 'weight');
  if (!weightDefinition) return null;
  const recent = [...checkins]
    .filter((checkin) => checkin.checkin_type === 'daily')
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))
    .slice(0, days);

  const nums = recent
    .map((checkin) => values.find((item) => item.body_checkin_id === checkin.id && item.metric_definition_id === weightDefinition.id)?.numeric_value)
    .filter((value): value is number => typeof value === 'number');

  if (nums.length === 0) return null;
  return roundMetric(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function calculateWeightChange(
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[],
  definitions: BodyMetricDefinitionRow[],
  days: number
) {
  const weightDefinition = definitions.find((item) => item.key === 'weight');
  if (!weightDefinition) return null;
  const daily = [...checkins]
    .filter((checkin) => checkin.checkin_type === 'daily')
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));

  const latest = daily[0];
  const prior = daily[days - 1];
  if (!latest || !prior) return null;

  const latestWeight = values.find((item) => item.body_checkin_id === latest.id && item.metric_definition_id === weightDefinition.id)?.numeric_value;
  const priorWeight = values.find((item) => item.body_checkin_id === prior.id && item.metric_definition_id === weightDefinition.id)?.numeric_value;

  if (typeof latestWeight !== 'number' || typeof priorWeight !== 'number') return null;
  return roundMetric(latestWeight - priorWeight);
}

function calculateBmiFromLatest(
  definitions: BodyMetricDefinitionRow[],
  checkins: BodyCheckinRow[],
  values: BodyMetricValueRow[]
) {
  const latestBmi = getLatestNumericMetric(definitions, checkins, values, 'bmi');
  if (latestBmi !== null) return latestBmi;
  const latestWeight = getLatestNumericMetric(definitions, checkins, values, 'weight');
  return latestWeight !== null ? calculateBmi(latestWeight) : null;
}

function classifyBmi(value: number | null) {
  if (value === null) return 'No data';
  if (value < 18.5) return 'Low';
  if (value <= 24.9) return 'Standard';
  if (value <= 29.9) return 'High';
  return 'Very High';
}

function classifyBodyFat(value: number | null) {
  if (value === null) return 'No data';
  if (value < 14) return 'Low / athletic-lean';
  if (value <= 17) return 'Excellent';
  if (value <= 24) return 'Standard';
  return 'High';
}

function classifyWater(value: number | null) {
  if (value === null) return 'No data';
  if (value < 50) return 'Low';
  if (value <= 65) return 'Standard';
  return 'High';
}

function classifyToneFromLabel(label: string): BodyStatusLabel['tone'] {
  if (label.startsWith('Excellent')) return 'excellent';
  if (label.startsWith('Standard')) return 'standard';
  if (label.startsWith('Low')) return 'low';
  if (label.startsWith('High') || label.startsWith('Very High')) return 'high';
  return 'info';
}

function formatMetricValue(value: number | null, unit?: string) {
  if (value === null) return 'No data';
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function formatSignedMetric(value: number | null, unit: string) {
  if (value === null) return 'No data';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value} ${unit}`;
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}
