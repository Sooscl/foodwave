import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';
import type { UserProfile } from '../../shared/types';
import { getCurrentProfile } from '../services/authService';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(initialSession);

      if (initialSession?.user) {
        const { data } = await getCurrentProfile();
        if (isMounted) {
          setProfile(data);
        }
      } else {
        if (isMounted) {
          setProfile(null);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
      if (!isMounted) {
        return;
      }

      setSession(authSession);

      if (authSession?.user) {
        const { data } = await getCurrentProfile();
        if (isMounted) {
          setProfile(data);
        }
      } else {
        if (isMounted) {
          setProfile(null);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    profile,
    isLoading,
    isAuthenticated: Boolean(session?.user),
  };
}
