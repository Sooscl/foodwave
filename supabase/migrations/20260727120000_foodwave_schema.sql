-- FoodWave core schema

create extension if not exists "uuid-ossp";

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

create table if not exists public.restaurant_memberships (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','admin','manager','staff')),
  created_at timestamptz not null default now(),
  unique(restaurant_id, profile_id)
);

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_memberships enable row level security;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.email, ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at();

drop trigger if exists restaurants_updated_at on public.restaurants;

create trigger restaurants_updated_at
before update on public.restaurants
for each row execute procedure public.update_updated_at();

drop policy if exists "Users can view their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can view restaurants they belong to" on public.restaurants;

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

drop policy if exists "Users can insert restaurants they own" on public.restaurants;
drop policy if exists "Users can update restaurants they own or manage" on public.restaurants;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'restaurants'
      and column_name = 'owner_id'
  ) then
    execute $sql$
      create policy "Users can insert restaurants they own"
        on public.restaurants
        for insert
        with check (auth.uid() = owner_id)
    $sql$;

    execute $sql$
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
        )
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'restaurants'
      and column_name = 'organization_id'
  )
  and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organization_memberships'
  ) then
    execute $sql$
      create policy "Users can insert restaurants they own"
        on public.restaurants
        for insert
        with check (
          exists (
            select 1
            from public.organization_memberships om
            where om.organization_id = public.restaurants.organization_id
              and om.profile_id = auth.uid()
              and om.role in ('owner','admin')
          )
        )
    $sql$;

    execute $sql$
      create policy "Users can update restaurants they own or manage"
        on public.restaurants
        for update
        using (
          exists (
            select 1
            from public.organization_memberships om
            where om.organization_id = public.restaurants.organization_id
              and om.profile_id = auth.uid()
              and om.role in ('owner','admin')
          )
          or exists (
            select 1
            from public.restaurant_memberships rm
            where rm.restaurant_id = public.restaurants.id
              and rm.profile_id = auth.uid()
              and rm.role in ('owner','admin','manager')
          )
        )
    $sql$;
  end if;
end;
$$;

drop policy if exists "Users can view memberships for their restaurants" on public.restaurant_memberships;

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

drop policy if exists "Users can manage memberships for their restaurants" on public.restaurant_memberships;

create policy "Users can manage memberships for their restaurants"
  on public.restaurant_memberships
  for insert
  with check (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurant_memberships.restaurant_id
        and rm.profile_id = auth.uid()
        and rm.role in ('owner','manager','admin')
    )
  );

drop policy if exists "Users can delete memberships for their restaurants" on public.restaurant_memberships;

create policy "Users can delete memberships for their restaurants"
  on public.restaurant_memberships
  for delete
  using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.restaurant_id = public.restaurant_memberships.restaurant_id
        and rm.profile_id = auth.uid()
        and rm.role in ('owner','manager','admin')
    )
  );
