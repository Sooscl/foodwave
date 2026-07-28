create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  enabled boolean not null default false,
  priority integer not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_triggers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  trigger_type text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_conditions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  field text not null,
  operator text not null,
  value jsonb not null default 'null'::jsonb,
  logical_group text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  action_type text not null,
  execution_order integer not null default 0,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null,
  subject text,
  body text not null,
  variables jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  trigger_event_type text not null,
  trigger_event_id text,
  execution_key text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  context_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, execution_key)
);

create table if not exists public.campaign_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_execution_id uuid not null references public.campaign_executions(id) on delete cascade,
  campaign_action_id uuid not null references public.campaign_actions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  processed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_execution_id uuid references public.campaign_executions(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_org_status_enabled
  on public.campaigns (organization_id, status, enabled);
create index if not exists idx_campaigns_org_priority
  on public.campaigns (organization_id, priority desc);
create index if not exists idx_campaign_triggers_org_type
  on public.campaign_triggers (organization_id, trigger_type, enabled);
create index if not exists idx_campaign_triggers_campaign
  on public.campaign_triggers (campaign_id);
create index if not exists idx_campaign_conditions_campaign
  on public.campaign_conditions (campaign_id, logical_group);
create index if not exists idx_campaign_actions_campaign_order
  on public.campaign_actions (campaign_id, execution_order, enabled);
create index if not exists idx_campaign_templates_org
  on public.campaign_templates (organization_id, channel);
create index if not exists idx_campaign_executions_org_created
  on public.campaign_executions (organization_id, created_at desc);
create index if not exists idx_campaign_executions_customer
  on public.campaign_executions (organization_id, customer_id, created_at desc);
create index if not exists idx_campaign_executions_status
  on public.campaign_executions (organization_id, status, created_at desc);
create index if not exists idx_campaign_queue_org_status_schedule
  on public.campaign_queue (organization_id, status, scheduled_for);
create index if not exists idx_campaign_queue_execution
  on public.campaign_queue (campaign_execution_id);
create index if not exists idx_campaign_logs_org_created
  on public.campaign_logs (organization_id, created_at desc);
create index if not exists idx_campaign_logs_execution
  on public.campaign_logs (campaign_execution_id, created_at desc);

create or replace function public.touch_campaign_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_campaigns_updated_at on public.campaigns;
create trigger trg_touch_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_triggers_updated_at on public.campaign_triggers;
create trigger trg_touch_campaign_triggers_updated_at
before update on public.campaign_triggers
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_conditions_updated_at on public.campaign_conditions;
create trigger trg_touch_campaign_conditions_updated_at
before update on public.campaign_conditions
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_actions_updated_at on public.campaign_actions;
create trigger trg_touch_campaign_actions_updated_at
before update on public.campaign_actions
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_templates_updated_at on public.campaign_templates;
create trigger trg_touch_campaign_templates_updated_at
before update on public.campaign_templates
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_executions_updated_at on public.campaign_executions;
create trigger trg_touch_campaign_executions_updated_at
before update on public.campaign_executions
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_queue_updated_at on public.campaign_queue;
create trigger trg_touch_campaign_queue_updated_at
before update on public.campaign_queue
for each row
execute function public.touch_campaign_updated_at();

drop trigger if exists trg_touch_campaign_logs_updated_at on public.campaign_logs;
create trigger trg_touch_campaign_logs_updated_at
before update on public.campaign_logs
for each row
execute function public.touch_campaign_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_triggers enable row level security;
alter table public.campaign_conditions enable row level security;
alter table public.campaign_actions enable row level security;
alter table public.campaign_templates enable row level security;
alter table public.campaign_executions enable row level security;
alter table public.campaign_queue enable row level security;
alter table public.campaign_logs enable row level security;

drop policy if exists campaigns_by_org on public.campaigns;
create policy campaigns_by_org
  on public.campaigns
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

drop policy if exists campaign_triggers_by_org on public.campaign_triggers;
create policy campaign_triggers_by_org
  on public.campaign_triggers
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

drop policy if exists campaign_conditions_by_org on public.campaign_conditions;
create policy campaign_conditions_by_org
  on public.campaign_conditions
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

drop policy if exists campaign_actions_by_org on public.campaign_actions;
create policy campaign_actions_by_org
  on public.campaign_actions
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

drop policy if exists campaign_templates_by_org on public.campaign_templates;
create policy campaign_templates_by_org
  on public.campaign_templates
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

drop policy if exists campaign_executions_by_org on public.campaign_executions;
create policy campaign_executions_by_org
  on public.campaign_executions
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

drop policy if exists campaign_queue_by_org on public.campaign_queue;
create policy campaign_queue_by_org
  on public.campaign_queue
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

drop policy if exists campaign_logs_by_org on public.campaign_logs;
create policy campaign_logs_by_org
  on public.campaign_logs
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
