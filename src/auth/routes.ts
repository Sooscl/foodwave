import type { AppRoute } from '../shared/types';

export const authRoutes: AppRoute[] = [
  { id: 'auth-login', path: '/auth/login', label: 'Login', module: 'auth', isProtected: false },
  { id: 'auth-signup', path: '/auth/signup', label: 'Sign Up', module: 'auth', isProtected: false },
];
