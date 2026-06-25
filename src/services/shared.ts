import type { PostgrestError } from '@supabase/supabase-js';
import { WORKSPACE_ID } from '../lib/constants';
import { getSupabaseClient } from '../lib/supabaseClient';

export type ServiceResult<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export async function listByWorkspace<T>(table: string, orderBy = 'created_at'): Promise<ServiceResult<T[]>> {
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .order(orderBy, { ascending: true });

  return { data: (data as T[] | null) ?? null, error };
}

export async function getById<T>(table: string, id: string): Promise<ServiceResult<T>> {
  const { data, error } = await getSupabaseClient()
    .from(table)
    .select('*')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('id', id)
    .single();

  return { data: (data as T | null) ?? null, error };
}

export async function createWithWorkspace<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Promise<ServiceResult<T>> {
  const { data, error } = await getSupabaseClient()
    .from(table)
    .insert({ ...payload, workspace_id: WORKSPACE_ID })
    .select()
    .single();

  return { data: (data as T | null) ?? null, error };
}

export async function updateById<T extends Record<string, unknown>>(
  table: string,
  id: string,
  payload: Partial<T>
): Promise<ServiceResult<T>> {
  const { data, error } = await getSupabaseClient()
    .from(table)
    .update(payload as Record<string, unknown>)
    .eq('workspace_id', WORKSPACE_ID)
    .eq('id', id)
    .select()
    .single();

  return { data: (data as T | null) ?? null, error };
}

export async function removeById(table: string, id: string): Promise<ServiceResult<null>> {
  const { error } = await getSupabaseClient()
    .from(table)
    .delete()
    .eq('workspace_id', WORKSPACE_ID)
    .eq('id', id);

  return { data: null, error };
}

export function isSupabaseError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'message' in error;
}

export function isMissingColumnError(error: unknown, column: string) {
  return isSupabaseError(error) && error.message.includes(`column ${column} does not exist`);
}

export function buildMissingMigrationError(message: string) {
  return new Error(message);
}
