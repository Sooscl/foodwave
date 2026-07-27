create table if not exists public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null check (platform in ('apple_wallet', 'google_wallet')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'revoked', 'error')),
  pass_identifier text not null,
  qr_token text not null,
  download_token text not null,
  download_endpoint text not null,
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, customer_id, platform),
  unique (pass_identifier),
  unique (qr_token),
  unique (download_token)
);

create table if not exists public.wallet_pass_sync_events (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id uuid not null references public.wallet_passes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'synchronized', 'downloaded', 'revoked', 'sync_failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_passes_org_customer on public.wallet_passes (organization_id, customer_id);
create index if not exists idx_wallet_passes_status on public.wallet_passes (status);
create index if not exists idx_wallet_pass_sync_events_org_customer on public.wallet_pass_sync_events (organization_id, customer_id, created_at desc);

create or replace function public.touch_wallet_pass_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_wallet_pass_updated_at on public.wallet_passes;

create trigger trg_touch_wallet_pass_updated_at
before update on public.wallet_passes
for each row
execute function public.touch_wallet_pass_updated_at();

alter table public.wallet_passes enable row level security;
alter table public.wallet_pass_sync_events enable row level security;

drop policy if exists wallet_passes_by_org on public.wallet_passes;

create policy wallet_passes_by_org
  on public.wallet_passes
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

drop policy if exists wallet_pass_sync_events_by_org on public.wallet_pass_sync_events;

create policy wallet_pass_sync_events_by_org
  on public.wallet_pass_sync_events
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
