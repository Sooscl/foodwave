import { useEffect, useMemo, useState } from 'react';
import App from '../../app/App';
import { useAuth } from '../hooks/useAuth';
import { resetPassword, signInWithPassword, signOut, signUpWithPassword } from '../services/authService';
import { getUserRestaurant } from '../services/restaurantService';
import { AuthScreen } from './AuthScreen';
import { OnboardingScreen } from './OnboardingScreen';
import { supabase } from '../../shared/lib/supabase';

type AuthView = 'login' | 'register' | 'forgot' | 'verify';

type AppState = 'auth' | 'onboarding' | 'app';

export function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [appState, setAppState] = useState<AppState>('auth');

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    const result = await signInWithPassword(email, password);
    setAuthLoading(false);
    return result;
  };

  const handleRegister = async (email: string, password: string) => {
    setAuthLoading(true);
    const result = await signUpWithPassword(email, password);
    setAuthLoading(false);
    return result;
  };

  const handleForgotPassword = async (email: string) => {
    setAuthLoading(true);
    const result = await resetPassword(email);
    setAuthLoading(false);
    return result;
  };

  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setAppState('auth');
      return;
    }

    let isMounted = true;

    async function resolveRestaurantState() {
      const { data: userData } = await supabase.from('profiles').select('onboarding_completed').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle();

      const { data } = await getUserRestaurant();
      if (!isMounted) {
        return;
      }

      const onboardingComplete = Boolean(userData?.onboarding_completed);
      setAppState(onboardingComplete || data ? 'app' : 'onboarding');
    }

    void resolveRestaurantState();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const activeView = useMemo(() => {
    if (appState === 'app') {
      return 'app';
    }

    if (appState === 'onboarding') {
      return 'onboarding';
    }

    return view;
  }, [appState, view]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>;
  }

  if (activeView === 'app') {
    return <App onLogout={handleLogout} />;
  }

  if (activeView === 'onboarding') {
    return <OnboardingScreen onComplete={() => setAppState('app')} />;
  }

  return (
    <AuthScreen
      mode={activeView}
      loading={authLoading}
      onNavigate={(path) => {
        const nextView = path === '/register' ? 'register' : path === '/forgot-password' ? 'forgot' : 'login';
        setView(nextView);
      }}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onForgotPassword={handleForgotPassword}
    />
  );
}
