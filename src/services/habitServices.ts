import type { HabitLogRow, HabitRow, InsertRow, UpdateRow } from '../types/database';
import { createWithWorkspace, getById, listByWorkspace, removeById, updateById } from './shared';

export const habitService = {
  list: () => listByWorkspace<HabitRow>('habits', 'position'),
  get: (id: string) => getById<HabitRow>('habits', id),
  create: (payload: InsertRow<HabitRow>) => createWithWorkspace<InsertRow<HabitRow>>('habits', payload),
  update: (id: string, payload: UpdateRow<HabitRow>) => updateById<HabitRow>('habits', id, payload),
  remove: (id: string) => removeById('habits', id)
};

export const habitLogService = {
  list: () => listByWorkspace<HabitLogRow>('habit_logs', 'logged_at'),
  get: (id: string) => getById<HabitLogRow>('habit_logs', id),
  create: (payload: InsertRow<HabitLogRow>) =>
    createWithWorkspace<InsertRow<HabitLogRow>>('habit_logs', payload),
  update: (id: string, payload: UpdateRow<HabitLogRow>) =>
    updateById<HabitLogRow>('habit_logs', id, payload),
  remove: (id: string) => removeById('habit_logs', id)
};
