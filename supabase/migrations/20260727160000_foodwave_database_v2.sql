-- FoodWave Database v2.0
-- Organization-first multi-tenant schema for Supabase

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  locale text not null default 'en',
  status text not null default 'active' check (status in ('active','suspended','archived')),
  billing_email text,
  metadata jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'active' check (status in ('active','invited','suspended','revoked')),
  invited_by uuid references public.profiles(id),
  joined_at timestamptz,
  revoked_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  locale text not null default 'en',
  status text not null default 'active' check (status in ('active','inactive','archived')),
  address_line_1 text,
  city text,
  country text,
  phone text,
  metadata jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','admin','manager','staff')),
  status text not null default 'active' check (status in ('active','invited','suspended','revoked')),
  invited_by uuid references public.profiles(id),
  joined_at timestamptz,
  revoked_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, profile_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  locale text not null default 'en',
  preferred_currency text not null default 'EUR',
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  consent_marketing boolean not null default false,
  consent_sms boolean not null default false,
  notes text,
  metadata jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  card_type text not null default 'loyalty' check (card_type in ('loyalty','gift','membership','promo')),
  provider text,
  external_ref text,
  status text not null default 'active' check (status in ('active','inactive','expired','revoked','pending')),
  issued_at timestamptz,
  expires_at timestamptz,
  metadata jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text,
  max_restaurants integer,
  max_team_members integer,
  features jsonb,
  price_monthly numeric(10,2),
  currency text not null default 'EUR',
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  restaurant_limit integer not null default 1 check (restaurant_limit >= 0),
  active_restaurant_count integer not null default 0 check (active_restaurant_count >= 0),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly','custom')),
  status text not null default 'trial' check (status in ('trial','active','past_due','canceled','suspended','expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  canceled_at timestamptz,
  billing_email text,
  metadata jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_restaurant_count <= restaurant_limit)
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_onboarding on public.profiles (onboarding_completed);
create index if not exists idx_organizations_slug on public.organizations (slug);
create index if not exists idx_organizations_status on public.organizations (status);
create index if not exists idx_org_memberships_org on public.organization_memberships (organization_id);
create index if not exists idx_org_memberships_profile on public.organization_memberships (profile_id);
create index if not exists idx_org_memberships_role on public.organization_memberships (role);
create index if not exists idx_restaurants_org on public.restaurants (organization_id);
create index if not exists idx_restaurants_slug on public.restaurants (slug);
create index if not exists idx_restaurants_status on public.restaurants (status);
create index if not exists idx_restaurant_memberships_restaurant on public.restaurant_memberships (restaurant_id);
create index if not exists idx_restaurant_memberships_profile on public.restaurant_memberships (profile_id);
create index if not exists idx_restaurant_memberships_role on public.restaurant_memberships (role);
create index if not exists idx_customers_org on public.customers (organization_id);
create index if not exists idx_customers_restaurant on public.customers (restaurant_id);
create index if not exists idx_customers_email on public.customers (email);
create index if not exists idx_wallet_cards_org on public.wallet_cards (organization_id);
create index if not exists idx_wallet_cards_restaurant on public.wallet_cards (restaurant_id);
create index if not exists idx_wallet_cards_customer on public.wallet_cards (customer_id);
create index if not exists idx_wallet_cards_status on public.wallet_cards (status);
create index if not exists idx_plans_code on public.plans (code);
create index if not exists idx_plans_active on public.plans (is_active);
create index if not exists idx_subscriptions_org on public.subscriptions (organization_id);
create index if not exists idx_subscriptions_plan on public.subscriptions (plan_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
