import type {
  InsertRow,
  ScheduledWorkoutRow,
  TemplateExerciseRow,
  UpdateRow,
  WorkoutExerciseLogRow,
  WorkoutSessionRow,
  WorkoutSetLogRow,
  WorkoutTemplateRow
} from '../types/database';
import { createWithWorkspace, getById, listByWorkspace, removeById, updateById } from './shared';

export const workoutTemplateService = {
  list: () => listByWorkspace<WorkoutTemplateRow>('workout_templates', 'position'),
  get: (id: string) => getById<WorkoutTemplateRow>('workout_templates', id),
  create: (payload: InsertRow<WorkoutTemplateRow>) =>
    createWithWorkspace<InsertRow<WorkoutTemplateRow>>('workout_templates', payload),
  update: (id: string, payload: UpdateRow<WorkoutTemplateRow>) =>
    updateById<WorkoutTemplateRow>('workout_templates', id, payload),
  remove: (id: string) => removeById('workout_templates', id)
};

export const templateExerciseService = {
  list: () => listByWorkspace<TemplateExerciseRow>('template_exercises', 'position'),
  get: (id: string) => getById<TemplateExerciseRow>('template_exercises', id),
  create: (payload: InsertRow<TemplateExerciseRow>) =>
    createWithWorkspace<InsertRow<TemplateExerciseRow>>('template_exercises', payload),
  update: (id: string, payload: UpdateRow<TemplateExerciseRow>) =>
    updateById<TemplateExerciseRow>('template_exercises', id, payload),
  remove: (id: string) => removeById('template_exercises', id)
};

export const scheduledWorkoutService = {
  list: () => listByWorkspace<ScheduledWorkoutRow>('scheduled_workouts', 'scheduled_date'),
  get: (id: string) => getById<ScheduledWorkoutRow>('scheduled_workouts', id),
  create: (payload: InsertRow<ScheduledWorkoutRow>) =>
    createWithWorkspace<InsertRow<ScheduledWorkoutRow>>('scheduled_workouts', payload),
  update: (id: string, payload: UpdateRow<ScheduledWorkoutRow>) =>
    updateById<ScheduledWorkoutRow>('scheduled_workouts', id, payload),
  remove: (id: string) => removeById('scheduled_workouts', id)
};

export const workoutSessionService = {
  list: () => listByWorkspace<WorkoutSessionRow>('workout_sessions', 'session_date'),
  get: (id: string) => getById<WorkoutSessionRow>('workout_sessions', id),
  create: (payload: InsertRow<WorkoutSessionRow>) =>
    createWithWorkspace<InsertRow<WorkoutSessionRow>>('workout_sessions', payload),
  update: (id: string, payload: UpdateRow<WorkoutSessionRow>) =>
    updateById<WorkoutSessionRow>('workout_sessions', id, payload),
  remove: (id: string) => removeById('workout_sessions', id)
};

export const workoutExerciseLogService = {
  list: () => listByWorkspace<WorkoutExerciseLogRow>('workout_exercise_logs', 'position'),
  get: (id: string) => getById<WorkoutExerciseLogRow>('workout_exercise_logs', id),
  create: (payload: InsertRow<WorkoutExerciseLogRow>) =>
    createWithWorkspace<InsertRow<WorkoutExerciseLogRow>>('workout_exercise_logs', payload),
  update: (id: string, payload: UpdateRow<WorkoutExerciseLogRow>) =>
    updateById<WorkoutExerciseLogRow>('workout_exercise_logs', id, payload),
  remove: (id: string) => removeById('workout_exercise_logs', id)
};

export const workoutSetLogService = {
  list: () => listByWorkspace<WorkoutSetLogRow>('workout_set_logs', 'set_number'),
  get: (id: string) => getById<WorkoutSetLogRow>('workout_set_logs', id),
  create: (payload: InsertRow<WorkoutSetLogRow>) =>
    createWithWorkspace<InsertRow<WorkoutSetLogRow>>('workout_set_logs', payload),
  update: (id: string, payload: UpdateRow<WorkoutSetLogRow>) =>
    updateById<WorkoutSetLogRow>('workout_set_logs', id, payload),
  remove: (id: string) => removeById('workout_set_logs', id)
};
