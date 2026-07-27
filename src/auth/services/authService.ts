import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse, UserProfile } from '../../shared/types';

function getConfiguredRedirectUrl(): string | undefined {
  const configuredRedirect = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL?.trim();

  if (configuredRedirect) {
    try {
      return new URL(configuredRedirect).toString();
    } catch {
      return undefined;
    }
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5173/login';
  }

  return undefined;
}

export async function signInWithPassword(email: string, password: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { message: 'Signed in successfully' }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown sign-in error' };
  }
}

export async function signUpWithPassword(email: string, password: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const redirectTo = getConfiguredRedirectUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { message: 'Account created. Please verify your email.' }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown sign-up error' };
  }
}

export async function resetPassword(email: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const redirectTo = getConfiguredRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? `${window.location.origin}/login`,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { message: 'Password reset email sent' }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown password reset error' };
  }
}

export async function signOut(): Promise<ApiResponse<{ message: string }>> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { message: 'Signed out' }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown sign-out error' };
  }
}

export async function getCurrentProfile(): Promise<ApiResponse<UserProfile>> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { data: null, error: error?.message ?? 'No active session' };
    }

    return {
      data: {
        id: user.id,
        createdAt: user.created_at ?? new Date().toISOString(),
        updatedAt: user.updated_at ?? new Date().toISOString(),
        email: user.email ?? '',
        fullName: user.user_metadata?.full_name ?? 'Restaurant Admin',
        role: 'owner',
        tenantId: user.user_metadata?.tenant_id ?? 'tenant-default',
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load profile' };
  }
}
