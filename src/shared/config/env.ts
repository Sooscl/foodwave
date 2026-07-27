type EnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_SUPABASE_AUTH_REDIRECT_URL';

const normalizeEnvValue = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const readEnv = (key: EnvKey) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? normalizeEnvValue(value) : undefined;
};

const requireEnv = (key: EnvKey) => {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const ensureUrl = (key: EnvKey, value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    throw new Error(`Invalid URL in environment variable: ${key}`);
  }
};

const optionalUrl = (key: EnvKey) => {
  const value = readEnv(key);
  return value ? ensureUrl(key, value) : null;
};

export const ENV = {
  supabase: {
    url: ensureUrl('VITE_SUPABASE_URL', requireEnv('VITE_SUPABASE_URL')),
    anonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
    authRedirectUrl: optionalUrl('VITE_SUPABASE_AUTH_REDIRECT_URL'),
  },
} as const;
