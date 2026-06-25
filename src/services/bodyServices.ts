import type {
  BodyCheckinRow,
  BodyMetricDefinitionRow,
  BodyMetricValueRow,
  InsertRow,
  UpdateRow
} from '../types/database';
import { createWithWorkspace, getById, listByWorkspace, removeById, updateById } from './shared';

export const bodyCheckinService = {
  list: () => listByWorkspace<BodyCheckinRow>('body_checkins', 'checkin_date'),
  get: (id: string) => getById<BodyCheckinRow>('body_checkins', id),
  create: (payload: InsertRow<BodyCheckinRow>) =>
    createWithWorkspace<InsertRow<BodyCheckinRow>>('body_checkins', payload),
  update: (id: string, payload: UpdateRow<BodyCheckinRow>) =>
    updateById<BodyCheckinRow>('body_checkins', id, payload),
  remove: (id: string) => removeById('body_checkins', id)
};

export const bodyMetricDefinitionService = {
  list: () => listByWorkspace<BodyMetricDefinitionRow>('body_metric_definitions', 'position'),
  get: (id: string) => getById<BodyMetricDefinitionRow>('body_metric_definitions', id),
  create: (payload: InsertRow<BodyMetricDefinitionRow>) =>
    createWithWorkspace<InsertRow<BodyMetricDefinitionRow>>('body_metric_definitions', payload),
  update: (id: string, payload: UpdateRow<BodyMetricDefinitionRow>) =>
    updateById<BodyMetricDefinitionRow>('body_metric_definitions', id, payload),
  remove: (id: string) => removeById('body_metric_definitions', id)
};

export const bodyMetricValueService = {
  list: () => listByWorkspace<BodyMetricValueRow>('body_metric_values', 'created_at'),
  get: (id: string) => getById<BodyMetricValueRow>('body_metric_values', id),
  create: (payload: InsertRow<BodyMetricValueRow>) =>
    createWithWorkspace<InsertRow<BodyMetricValueRow>>('body_metric_values', payload),
  update: (id: string, payload: UpdateRow<BodyMetricValueRow>) =>
    updateById<BodyMetricValueRow>('body_metric_values', id, payload),
  remove: (id: string) => removeById('body_metric_values', id)
};
