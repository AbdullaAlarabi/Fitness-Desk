export const DEFAULT_WORKSPACE_ID = 'abdulla-fitness-desk';

export const WORKSPACE_ID =
  import.meta.env.VITE_WORKSPACE_ID?.trim() || DEFAULT_WORKSPACE_ID;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
