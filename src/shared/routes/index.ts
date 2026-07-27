import type { AppRoute } from '../types';

export const appRoutes: AppRoute[] = [
  { id: 'auth', path: '/auth', label: 'Authentication', module: 'auth', isProtected: false },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', module: 'dashboard', isProtected: true },
  { id: 'crm', path: '/crm', label: 'CRM', module: 'crm', isProtected: true },
  { id: 'marketing', path: '/marketing', label: 'Marketing', module: 'marketing', isProtected: true },
  { id: 'meta', path: '/meta', label: 'Meta', module: 'meta', isProtected: true },
  { id: 'google', path: '/google', label: 'Google', module: 'google', isProtected: true },
  { id: 'wallet', path: '/wallet', label: 'Wallet', module: 'wallet', isProtected: true },
  { id: 'notifications', path: '/notifications', label: 'Notifications', module: 'notifications', isProtected: true },
  { id: 'analytics', path: '/analytics', label: 'Analytics', module: 'analytics', isProtected: true },
  { id: 'settings', path: '/settings', label: 'Settings', module: 'settings', isProtected: true },
];
