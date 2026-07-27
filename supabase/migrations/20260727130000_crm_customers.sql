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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create index if not exists customers_restaurant_id_idx on public.customers (restaurant_id);
create index if not exists customers_email_idx on public.customers (email);

create trigger customers_updated_at
before update on public.customers
for each row execute procedure public.update_updated_at();

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
