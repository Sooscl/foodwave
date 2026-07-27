-- FoodWave complete installation script
-- Run this directly in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- Drop existing objects safely, but only after checking that the target table exists.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists profiles_updated_at on public.profiles';
    execute 'drop policy if exists "Users can view their own profile" on public.profiles';
    execute 'drop policy if exists "Users can update their own profile" on public.profiles';
    execute 'drop policy if exists "Users can insert their own profile" on public.profiles';
  end if;

  if to_regclass('public.restaurants') is not null then
    execute 'drop trigger if exists restaurants_updated_at on public.restaurants';
    execute 'drop policy if exists "Users can view restaurants they belong to" on public.restaurants';
    execute 'drop policy if exists "Users can insert restaurants they own" on public.restaurants';
    execute 'drop policy if exists "Users can update restaurants they own or manage" on public.restaurants';
  end if;

  if to_regclass('public.restaurant_memberships') is not null then
    execute 'drop policy if exists "Users can view memberships for their restaurants" on public.restaurant_memberships';
    execute 'drop policy if exists "Users can manage memberships for their restaurants" on public.restaurant_memberships';
    execute 'drop policy if exists "Users can delete memberships for their restaurants" on public.restaurant_memberships';
  end if;

  if to_regclass('public.customers') is not null then
    execute 'drop trigger if exists customers_updated_at on public.customers';
    execute 'drop trigger if exists trg_update_customer_business_metrics on public.customers';
    execute 'drop policy if exists "Users can view customers in their restaurants" on public.customers';
    execute 'drop policy if exists "Users can insert customers in their restaurants" on public.customers';
    execute 'drop policy if exists "Users can update customers in their restaurants" on public.customers';
    execute 'drop policy if exists "Users can delete customers in their restaurants" on public.customers';
  end if;

  if to_regclass('public.wallet_cards') is not null then
    execute 'drop trigger if exists trg_touch_wallet_card_updated_at on public.wallet_cards';
    execute 'drop policy if exists wallet_cards_select_own_restaurant on public.wallet_cards';
    execute 'drop policy if exists wallet_cards_insert_own_restaurant on public.wallet_cards';
    execute 'drop policy if exists wallet_cards_update_own_restaurant on public.wallet_cards';
    execute 'drop policy if exists wallet_cards_delete_own_restaurant on public.wallet_cards';
  end if;
end $$;

-- Drop auth trigger safely if the auth schema is present.
do $$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
  end if;
end $$;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_updated_at() cascade;
drop function if exists public.update_customer_business_metrics() cascade;
drop function if exists public.touch_wallet_card_updated_at() cascade;

drop table if exists public.wallet_cards cascade;
drop table if exists public.customers cascade;
drop table if exists public.restaurant_memberships cascade;
drop table if exists public.restaurants cascade;
drop table if exists public.profiles cascade;

-- 1) Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role text not null default 'owner' check (role in ('owner','manager','staff')),
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Restaurants
create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null default 'Starter' check (plan in ('Starter','Growth','Pro','Enterprise')),
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Restaurant memberships
create table if not exists public.restaurant_memberships (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','admin','manager','staff')),
  created_at timestamptz not null default now(),
  unique(restaurant_id, profile_id)
);

-- 4) Customers
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  birthday date,
  notes text,
  tags text[] not null default '{}',
  total_visits integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_visit timestamptz,
  customer_score integer,
  customer_status text,
  average_ticket numeric(12,2),
  lifetime_value numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Wallet cards
create table if not exists public.wallet_cards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  pass_identifier text not null,
  platform text not null check (platform in ('Apple Wallet', 'Google Wallet')),
  status text not null default 'Active' check (status in ('Active', 'Suspended', 'Revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.wallet_cards enable row level security;

-- Helper functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.email, ''))
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_customer_business_metrics()
returns trigger
language plpgsql
as $$
declare
  visits integer;
  spent numeric;
  last_visit_date date;
  days_since_last_visit integer;
  visit_score integer;
  spend_score integer;
  recency_score integer;
begin
  visits := coalesce(new.total_visits, 0);
  spent := coalesce(new.total_spent, 0)::numeric;

  if new.last_visit is not null then
    last_visit_date := new.last_visit::date;
    days_since_last_visit := greatest(0, current_date - last_visit_date);
  else
    days_since_last_visit := 999;
  end if;

  visit_score := least(40, visits * 8);
  spend_score := least(40, greatest(0, floor(spent / 100.0)::int));

  if days_since_last_visit <= 30 then
    recency_score := 20;
  elsif days_since_last_visit <= 90 then
    recency_score := 10;
  else
    recency_score := 0;
  end if;

  new.customer_score := least(100, greatest(0, visit_score + spend_score + recency_score));

  if new.customer_score >= 80 and spent >= 2000 then
    new.customer_status := 'VIP';
  elsif days_since_last_visit <= 30 then
    new.customer_status := 'Active';
  elsif days_since_last_visit <= 90 then
    new.customer_status := 'At Risk';
  else
    new.customer_status := 'Lost';
  end if;

  if visits > 0 then
    new.average_ticket := round(spent / visits, 2);
  else
    new.average_ticket := 0;
  end if;

  new.lifetime_value := round(spent, 2);
  return new;
end;
$$;

create or replace function public.touch_wallet_card_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at();

create trigger restaurants_updated_at
before update on public.restaurants
for each row execute procedure public.update_updated_at();

create trigger customers_updated_at
before update on public.customers
for each row execute procedure public.update_updated_at();

create trigger trg_update_customer_business_metrics
before insert or update of total_visits, total_spent, last_visit on public.customers
for each row execute function public.update_customer_business_metrics();

create trigger trg_touch_wallet_card_updated_at
before update on public.wallet_cards
for each row execute function public.touch_wallet_card_updated_at();

-- Indexes
create index if not exists customers_restaurant_id_idx on public.customers (restaurant_id);
create index if not exists customers_email_idx on public.customers (email);
create index if not exists restaurant_memberships_restaurant_id_idx on public.restaurant_memberships (restaurant_id);
create index if not exists restaurant_memberships_profile_id_idx on public.restaurant_memberships (profile_id);
create index if not exists wallet_cards_restaurant_id_idx on public.wallet_cards (restaurant_id);
create index if not exists wallet_cards_customer_id_idx on public.wallet_cards (customer_id);
create index if not exists wallet_cards_status_idx on public.wallet_cards (status);

-- RLS policies
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can view restaurants they belong to"
  on public.restaurants
  for select
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurants.id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Users can insert restaurants they own"
  on public.restaurants
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update restaurants they own or manage"
  on public.restaurants
  for update
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurants.id
        and rm.profile_id = auth.uid()
        and rm.role in ('owner','manager')
    )
  );

create policy "Users can view memberships for their restaurants"
  on public.restaurant_memberships
  for select
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurant_memberships.restaurant_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Users can manage memberships for their restaurants"
  on public.restaurant_memberships
  for insert
  with check (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurant_memberships.restaurant_id
        and rm.profile_id = auth.uid()
        and rm.role in ('owner','manager')
    )
  );

create policy "Users can delete memberships for their restaurants"
  on public.restaurant_memberships
  for delete
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurant_memberships.restaurant_id
        and rm.profile_id = auth.uid()
        and rm.role in ('owner','manager')
    )
  );

create policy "Users can view customers in their restaurants"
  on public.customers
  for select
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.customers.restaurant_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Users can insert customers in their restaurants"
  on public.customers
  for insert
  with check (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.customers.restaurant_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Users can update customers in their restaurants"
  on public.customers
  for update
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.customers.restaurant_id
        and rm.profile_id = auth.uid()
    )
  );

create policy "Users can delete customers in their restaurants"
  on public.customers
  for delete
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.customers.restaurant_id
        and rm.profile_id = auth.uid()
    )
  );

create policy wallet_cards_select_own_restaurant
  on public.wallet_cards
  for select
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy wallet_cards_insert_own_restaurant
  on public.wallet_cards
  for insert
  with check (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy wallet_cards_update_own_restaurant
  on public.wallet_cards
  for update
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy wallet_cards_delete_own_restaurant
  on public.wallet_cards
  for delete
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );
