import type { ScheduledWorkoutRow, WorkoutTemplateRow } from '../types/database';
import {
  getNextStructuredWorkoutDay,
  getWorkoutHeroCopy,
  getWorkoutPlanDayByTemplate,
  getWorkoutPlanDayForDate,
  type WorkoutHeroCopy,
  type WorkoutPlanDayConfig
} from '../data/workout-plan';

export type ResolvedTrainingDay = {
  day: WorkoutPlanDayConfig;
  hero: WorkoutHeroCopy;
};

export function resolveTrainingDayForDate(
  date: Date,
  options?: {
    scheduledWorkout?: ScheduledWorkoutRow | null;
    template?: WorkoutTemplateRow | null;
  }
): ResolvedTrainingDay {
  const byTemplate = getWorkoutPlanDayByTemplate(
    options?.template?.name ?? options?.scheduledWorkout?.title ?? null,
    options?.template?.day_label ?? null
  );

  const day = byTemplate ?? getWorkoutPlanDayForDate(date);
  return {
    day,
    hero: getWorkoutHeroCopy(day)
  };
}

export function resolveNextTrainingDay(
  date: Date,
  options?: {
    upcomingScheduledWorkouts?: ScheduledWorkoutRow[];
    templates?: WorkoutTemplateRow[];
  }
): ResolvedTrainingDay {
  const futureScheduled = (options?.upcomingScheduledWorkouts ?? [])
    .filter((item) => new Date(`${item.scheduled_date}T12:00:00`) > date)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

  if (futureScheduled) {
    const template =
      options?.templates?.find((item) => item.id === futureScheduled.template_id) ??
      options?.templates?.find((item) => item.name === futureScheduled.title) ??
      null;

    return resolveTrainingDayForDate(new Date(`${futureScheduled.scheduled_date}T12:00:00`), {
      scheduledWorkout: futureScheduled,
      template
    });
  }

  const day = getNextStructuredWorkoutDay(date);
  return {
    day,
    hero: getWorkoutHeroCopy(day)
  };
}
