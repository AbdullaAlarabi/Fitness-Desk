import type { IntakeItemRow, IntakeLogRow, InsertRow, UpdateRow } from '../types/database';
import { createWithWorkspace, getById, listByWorkspace, removeById, updateById } from './shared';

export const intakeItemService = {
  list: () => listByWorkspace<IntakeItemRow>('intake_items', 'position'),
  get: (id: string) => getById<IntakeItemRow>('intake_items', id),
  create: (payload: InsertRow<IntakeItemRow>) =>
    createWithWorkspace<InsertRow<IntakeItemRow>>('intake_items', payload),
  update: (id: string, payload: UpdateRow<IntakeItemRow>) =>
    updateById<IntakeItemRow>('intake_items', id, payload),
  remove: (id: string) => removeById('intake_items', id)
};

export const intakeLogService = {
  list: () => listByWorkspace<IntakeLogRow>('intake_logs', 'logged_at'),
  get: (id: string) => getById<IntakeLogRow>('intake_logs', id),
  create: (payload: InsertRow<IntakeLogRow>) =>
    createWithWorkspace<InsertRow<IntakeLogRow>>('intake_logs', payload),
  update: (id: string, payload: UpdateRow<IntakeLogRow>) =>
    updateById<IntakeLogRow>('intake_logs', id, payload),
  remove: (id: string) => removeById('intake_logs', id)
};
