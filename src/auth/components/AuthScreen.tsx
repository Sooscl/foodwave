import { useMemo, useState } from 'react';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

interface AuthScreenProps {
  mode: AuthMode;
  loading: boolean;
  onNavigate: (path: string) => void;
  onLogin: (email: string, password: string) => Promise<{ error: string | null; message?: string | null }>;
  onRegister: (email: string, password: string) => Promise<{ error: string | null; message?: string | null }>;
  onForgotPassword: (email: string) => Promise<{ error: string | null; message?: string | null }>;
}

export function AuthScreen({
  mode,
  loading,
  onNavigate,
  onLogin,
  onRegister,
  onForgotPassword,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    switch (mode) {
      case 'register':
        return 'Create your FoodWave account';
      case 'forgot':
        return 'Reset your password';
      case 'verify':
        return 'Verify your email';
      default:
        return 'Welcome back';
    }
  }, [mode]);

  const subtitle = useMemo(() => {
    switch (mode) {
      case 'register':
        return 'Set up your workspace and start managing your restaurant operations.';
      case 'forgot':
        return 'Enter your email and we will send a secure recovery link.';
      case 'verify':
        return 'Please check your inbox and confirm your address before continuing.';
      default:
        return 'Sign in to your restaurant operating system.';
    }
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === 'forgot') {
      const result = await onForgotPassword(email);
      setMessage(result.message ?? null);
      setError(result.error ?? null);
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      const result = await onRegister(email, password);
      setMessage(result.message ?? null);
      setError(result.error ?? null);
      return;
    }

    const result = await onLogin(email, password);
    setMessage(result.message ?? null);
    setError(result.error ?? null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-black/30">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6B35]">FoodWave</p>
          <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        {(message || error) && (
          <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
            {error ?? message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-slate-300" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:border-[#FF6B35]"
              placeholder="chef@restaurant.com"
            />
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:border-[#FF6B35]"
                placeholder="Enter your password"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:border-[#FF6B35]"
                placeholder="Confirm your password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e55a24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'verify' ? 'Continue' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          {mode !== 'login' && (
            <button type="button" className="hover:text-white" onClick={() => onNavigate('/login')}>
              Back to sign in
            </button>
          )}

          {mode === 'login' && (
            <>
              <button type="button" className="hover:text-white" onClick={() => onNavigate('/register')}>
                Create account
              </button>
              <button type="button" className="hover:text-white" onClick={() => onNavigate('/forgot-password')}>
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
