export type RouteModule =
  | 'auth'
  | 'dashboard'
  | 'crm'
  | 'marketing'
  | 'meta'
  | 'google'
  | 'wallet'
  | 'notifications'
  | 'analytics'
  | 'settings';

export interface AppRoute {
  id: string;
  path: string;
  label: string;
  module: RouteModule;
  isProtected: boolean;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'enterprise';
}

export interface UserProfile extends BaseEntity {
  email: string;
  fullName: string;
  role: 'owner' | 'manager' | 'staff';
  tenantId: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
