create table if not exists public.loyalty_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  is_enabled boolean not null default true,
  points_per_currency_unit numeric(10,4) not null default 1,
  currency_unit numeric(10,2) not null default 1,
  rounding_strategy text not null default 'floor' check (rounding_strategy in ('floor', 'round', 'ceil')),
  base_multiplier numeric(10,4) not null default 1,
  allow_negative_balance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (points_per_currency_unit >= 0),
  check (currency_unit > 0),
  check (base_multiplier > 0)
);

create table if not exists public.customer_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  priority integer not null,
  min_points integer not null default 0,
  multiplier numeric(10,4) not null default 1,
  benefits jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, priority),
  check (priority >= 0),
  check (min_points >= 0),
  check (multiplier > 0)
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  points_cost integer not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  check (points_cost > 0)
);

create table if not exists public.loyalty_wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_balance integer not null default 0,
  lifetime_points integer not null default 0,
  current_level_id uuid references public.customer_levels(id) on delete set null,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, customer_id),
  check (points_balance >= 0),
  check (lifetime_points >= 0)
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  wallet_id uuid not null references public.loyalty_wallets(id) on delete cascade,
  visit_id uuid references public.customer_visits(id) on delete set null,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  transaction_type text not null check (transaction_type in ('earn', 'redeem', 'adjustment', 'reversal')),
  points_delta integer not null,
  balance_after integer not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reward_id uuid not null references public.loyalty_rewards(id) on delete cascade,
  transaction_id uuid not null references public.loyalty_transactions(id) on delete cascade,
  points_spent integer not null,
  status text not null default 'redeemed' check (status in ('redeemed', 'reverted')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (points_spent > 0)
);

create index if not exists idx_loyalty_configs_org on public.loyalty_configs (organization_id);
create index if not exists idx_customer_levels_org_active on public.customer_levels (organization_id, is_active, min_points);
create index if not exists idx_loyalty_rewards_org_active on public.loyalty_rewards (organization_id, is_active, is_deleted);
create index if not exists idx_loyalty_wallets_org_customer on public.loyalty_wallets (organization_id, customer_id);
create index if not exists idx_loyalty_transactions_org_customer on public.loyalty_transactions (organization_id, customer_id, created_at desc);
create index if not exists idx_loyalty_transactions_visit on public.loyalty_transactions (visit_id) where visit_id is not null;
create unique index if not exists uniq_loyalty_earn_transaction_per_visit
  on public.loyalty_transactions (visit_id, transaction_type)
  where visit_id is not null and transaction_type = 'earn';
create index if not exists idx_reward_history_org_customer on public.reward_history (organization_id, customer_id, created_at desc);

create or replace function public.touch_loyalty_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_loyalty_configs_updated_at on public.loyalty_configs;
create trigger trg_touch_loyalty_configs_updated_at
before update on public.loyalty_configs
for each row
execute function public.touch_loyalty_updated_at();

drop trigger if exists trg_touch_customer_levels_updated_at on public.customer_levels;
create trigger trg_touch_customer_levels_updated_at
before update on public.customer_levels
for each row
execute function public.touch_loyalty_updated_at();

drop trigger if exists trg_touch_loyalty_rewards_updated_at on public.loyalty_rewards;
create trigger trg_touch_loyalty_rewards_updated_at
before update on public.loyalty_rewards
for each row
execute function public.touch_loyalty_updated_at();

drop trigger if exists trg_touch_loyalty_wallets_updated_at on public.loyalty_wallets;
create trigger trg_touch_loyalty_wallets_updated_at
before update on public.loyalty_wallets
for each row
execute function public.touch_loyalty_updated_at();

alter table public.loyalty_configs enable row level security;
alter table public.customer_levels enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_wallets enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.reward_history enable row level security;

drop policy if exists loyalty_configs_by_org on public.loyalty_configs;

create policy loyalty_configs_by_org
  on public.loyalty_configs
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );

drop policy if exists customer_levels_by_org on public.customer_levels;

create policy customer_levels_by_org
  on public.customer_levels
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );

drop policy if exists loyalty_rewards_by_org on public.loyalty_rewards;

create policy loyalty_rewards_by_org
  on public.loyalty_rewards
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );

drop policy if exists loyalty_wallets_by_org on public.loyalty_wallets;

create policy loyalty_wallets_by_org
  on public.loyalty_wallets
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );

drop policy if exists loyalty_transactions_by_org on public.loyalty_transactions;

create policy loyalty_transactions_by_org
  on public.loyalty_transactions
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );

drop policy if exists reward_history_by_org on public.reward_history;

create policy reward_history_by_org
  on public.reward_history
  for all
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid() and is_deleted = false
    )
  );
