import { WORKSPACE_ID } from '../lib/constants';
import type { BodyMetricDefinitionRow, IntakeItemRow, WorkoutTemplateRow } from '../types/database';
import { intakeSchedule } from '../data/intakeSchedule';
import { workoutPlan } from '../data/workout-plan';
import { bodyMetricDefinitionService } from './bodyServices';
import { intakeItemService } from './intakeServices';
import { isMissingColumnError } from './shared';
import { templateExerciseService, workoutTemplateService } from './workoutServices';

const metricSeeds = [
  { key: 'weight', label: 'Weight', unit: 'kg', category: 'core', position: 1, value_type: 'number' },
  { key: 'bmi', label: 'BMI', unit: null, category: 'scale', position: 2, value_type: 'number' },
  { key: 'body_fat', label: 'Body Fat', unit: '%', category: 'core', position: 3, value_type: 'number' },
  { key: 'muscle_mass', label: 'Muscle Mass', unit: 'kg', category: 'scale', position: 4, value_type: 'number' },
  { key: 'bmr', label: 'BMR', unit: 'kcal', category: 'scale', position: 5, value_type: 'number' },
  { key: 'body_water', label: 'Body Water', unit: '%', category: 'core', position: 6, value_type: 'number' },
  { key: 'body_fat_mass', label: 'Body Fat Mass', unit: 'kg', category: 'scale', position: 7, value_type: 'number' },
  { key: 'lean_body_mass', label: 'Lean Body Mass', unit: 'kg', category: 'scale', position: 8, value_type: 'number' },
  { key: 'bone_mass', label: 'Bone Mass', unit: 'kg', category: 'scale', position: 9, value_type: 'number' },
  { key: 'visceral_fat', label: 'Visceral Fat', unit: null, category: 'scale', position: 10, value_type: 'number' },
  { key: 'protein', label: 'Protein', unit: '%', category: 'scale', position: 11, value_type: 'number' },
  { key: 'skeletal_muscle_mass', label: 'Skeletal Muscle Mass', unit: 'kg', category: 'scale', position: 12, value_type: 'number' },
  { key: 'subcutaneous_mass', label: 'Subcutaneous Mass', unit: '%', category: 'scale', position: 13, value_type: 'number' },
  { key: 'body_age', label: 'Body Age', unit: 'years', category: 'scale', position: 14, value_type: 'number' },
  { key: 'body_type', label: 'Body Type', unit: null, category: 'scale', position: 15, value_type: 'text' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', category: 'scale', position: 16, value_type: 'number' },
  { key: 'energy_level', label: 'Energy Level', unit: null, category: 'daily', position: 17, value_type: 'number' },
  { key: 'sleep_hours', label: 'Sleep Hours', unit: 'h', category: 'daily', position: 18, value_type: 'number' },
  { key: 'soreness_level', label: 'Soreness Level', unit: null, category: 'daily', position: 19, value_type: 'number' }
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  unit: string | null;
  category: string;
  position: number;
  value_type: 'number' | 'text';
}>;

const intakeSeeds = intakeSchedule.map((item, index) => ({
  name: item.name,
  category: item.name === 'Protein' ? 'nutrition' : 'supplement',
  timing: item.timing,
  frequency: item.timing === 'post_workout' ? 'training_days' : 'daily',
  notes: item.notes ?? null,
  position: index + 1
})) satisfies ReadonlyArray<{
  name: string;
  category: string;
  timing: string;
  frequency: string;
  notes: string | null;
  position: number;
}>;

const templateSeeds = workoutPlan.map((day) => ({
  name: day.title,
  day_label: `Day ${day.dayNumber}`,
  description: `Focus: ${day.focus}. Warm-up: ${day.warmup}`,
  position: day.dayNumber
})) satisfies ReadonlyArray<{
  name: string;
  day_label: string;
  description: string;
  position: number;
}>;

export type SeedSummary = {
  workspaceId: string;
  bodyMetricDefinitions: { existing: number; inserted: number; totalTarget: number };
  intakeItems: { existing: number; inserted: number; totalTarget: number };
  workoutTemplates: { existing: number; inserted: number; totalTarget: number };
  templateExercises: { existing: number; inserted: number; totalTarget: number };
};

export async function getSeedSummary(): Promise<SeedSummary> {
  const [metrics, items, templates, templateExercises] = await Promise.all([
    bodyMetricDefinitionService.list(),
    intakeItemService.list(),
    workoutTemplateService.list(),
    templateExerciseService.list()
  ]);

  if (metrics.error) throw metrics.error;
  if (items.error) throw items.error;
  if (templates.error) throw templates.error;
  if (templateExercises.error) throw templateExercises.error;

  return {
    workspaceId: WORKSPACE_ID,
    bodyMetricDefinitions: {
      existing: countExistingMetrics(metrics.data ?? []),
      inserted: 0,
      totalTarget: metricSeeds.length
    },
    intakeItems: {
      existing: countExistingIntake(items.data ?? []),
      inserted: 0,
      totalTarget: intakeSeeds.length
    },
    workoutTemplates: {
      existing: countExistingTemplates(templates.data ?? []),
      inserted: 0,
      totalTarget: templateSeeds.length
    },
    templateExercises: {
      existing: countExistingTemplateExercises(templateExercises.data ?? [], templates.data ?? []),
      inserted: 0,
      totalTarget: workoutPlan.flatMap((day) => day.exercises).length
    }
  };
}

export async function seedInitialFitnessDeskData(): Promise<SeedSummary> {
  const metricRows = (await bodyMetricDefinitionService.list()).data ?? [];
  const intakeRows = (await intakeItemService.list()).data ?? [];
  const templateRows = (await workoutTemplateService.list()).data ?? [];
  const templateExerciseRows = (await templateExerciseService.list()).data ?? [];

  let metricInserted = 0;
  for (const seed of metricSeeds) {
    const exists = metricRows.some((row) => row.key === seed.key);
    if (!exists) {
      const result = await createBodyMetricDefinitionSeed(seed);
      if (result.error) throw result.error;
      metricInserted += 1;
    }
  }

  let intakeInserted = 0;
  for (const seed of intakeSeeds) {
    const exists = intakeRows.some((row) => row.name.toLowerCase() === seed.name.toLowerCase());
    if (!exists) {
      const result = await createIntakeItemSeed(seed);
      if (result.error) throw result.error;
      intakeInserted += 1;
    }
  }

  let templateInserted = 0;
  for (const seed of templateSeeds) {
    const exists = templateRows.some((row) => row.day_label === seed.day_label && row.name === seed.name);
    if (!exists) {
      const result = await workoutTemplateService.create({
        name: seed.name,
        day_label: seed.day_label,
        description: seed.description,
        position: seed.position,
        is_active: true
      });
      if (result.error) throw result.error;
      templateInserted += 1;
    }
  }

  const refreshedTemplates = (await workoutTemplateService.list()).data ?? templateRows;

  let templateExerciseInserted = 0;
  for (const day of workoutPlan) {
    if (day.detailLevel !== 'exact' || day.exercises.length === 0) continue;
    const template = refreshedTemplates.find((row) => row.day_label === `Day ${day.dayNumber}` && row.name === day.title);
    if (!template) continue;

    for (const [index, exercise] of day.exercises.entries()) {
      const exists = templateExerciseRows.some(
        (row) => row.template_id === template.id && row.position === index + 1 && row.exercise_name === exercise.name
      );

      if (exists) continue;

      const result = await templateExerciseService.create({
        template_id: template.id,
        exercise_name: exercise.name,
        exercise_group: exercise.targetMuscles,
        equipment_type: exercise.category,
        set_count: exercise.sets,
        rep_range_min: exercise.minReps,
        rep_range_max: exercise.maxReps,
        rest_seconds: exercise.restSeconds,
        target_rpe: null,
        notes: [
          exercise.note,
          `Setup: ${exercise.machineSetup}`,
          `Cue: ${exercise.mainCue}`,
          `Mistake: ${exercise.commonMistake}`,
          `Alternatives: ${exercise.alternatives.join(' / ')}`
        ].join(' '),
        position: index + 1
      });
      if (result.error) throw result.error;
      templateExerciseInserted += 1;
    }
  }

  const refreshed = await getSeedSummary();
  return {
    ...refreshed,
    bodyMetricDefinitions: { ...refreshed.bodyMetricDefinitions, inserted: metricInserted },
    intakeItems: { ...refreshed.intakeItems, inserted: intakeInserted },
    workoutTemplates: { ...refreshed.workoutTemplates, inserted: templateInserted },
    templateExercises: { ...refreshed.templateExercises, inserted: templateExerciseInserted }
  };
}

function countExistingMetrics(rows: BodyMetricDefinitionRow[]) {
  return metricSeeds.filter((seed) => rows.some((row) => row.key === seed.key)).length;
}

function countExistingIntake(rows: IntakeItemRow[]) {
  return intakeSeeds.filter((seed) => rows.some((row) => row.name.toLowerCase() === seed.name.toLowerCase())).length;
}

function countExistingTemplates(rows: WorkoutTemplateRow[]) {
  return templateSeeds.filter((seed) => rows.some((row) => row.day_label === seed.day_label && row.name === seed.name)).length;
}

function countExistingTemplateExercises(rows: NonNullable<Awaited<ReturnType<typeof templateExerciseService.list>>['data']>, templates: WorkoutTemplateRow[]) {
  const exactTargets = workoutPlan.flatMap((day) => {
    const template = templates.find((row) => row.day_label === `Day ${day.dayNumber}` && row.name === day.title);
    if (!template || day.detailLevel !== 'exact') return [];
    return day.exercises.map((exercise, index) => ({
      templateId: template.id,
      exerciseName: exercise.name,
      position: index + 1
    }));
  });

  return exactTargets.filter((target) =>
    rows.some(
      (row) => row.template_id === target.templateId && row.exercise_name === target.exerciseName && row.position === target.position
    )
  ).length;
}

async function createBodyMetricDefinitionSeed(seed: (typeof metricSeeds)[number]) {
  const payload = {
    key: seed.key,
    label: seed.label,
    unit: seed.unit,
    value_type: seed.value_type ?? 'number',
    category: seed.category,
    is_active: true,
    position: seed.position
  };
  const result = await bodyMetricDefinitionService.create(payload);
  if (!isMissingColumnError(result.error, 'body_metric_definitions.category')) {
    return result;
  }

  return bodyMetricDefinitionService.create({
    key: seed.key,
    label: seed.label,
    unit: seed.unit,
    value_type: seed.value_type ?? 'number',
    is_active: true,
    position: seed.position
  });
}

async function createIntakeItemSeed(seed: (typeof intakeSeeds)[number]) {
  const payload = {
    name: seed.name,
    category: seed.category,
    timing: seed.timing,
    frequency: seed.frequency,
    default_amount: null,
    default_unit: null,
    notes: seed.notes,
    is_active: true,
    position: seed.position
  };
  const result = await intakeItemService.create(payload);
  if (
    !isMissingColumnError(result.error, 'intake_items.timing') &&
    !isMissingColumnError(result.error, 'intake_items.frequency')
  ) {
    return result;
  }

  return intakeItemService.create({
    name: seed.name,
    category: seed.category,
    default_amount: null,
    default_unit: null,
    notes: seed.notes,
    is_active: true,
    position: seed.position
  });
}
