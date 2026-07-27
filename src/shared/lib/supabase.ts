import { createClient } from '@supabase/supabase-js';

const getRequiredEnvVar = (value: string | undefined, variableName: string) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }

  return normalizedValue;
};

const supabaseUrl = getRequiredEnvVar(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
