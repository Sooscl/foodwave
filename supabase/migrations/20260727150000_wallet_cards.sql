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

alter table public.wallet_cards enable row level security;

create policy if not exists wallet_cards_select_own_restaurant
  on public.wallet_cards
  for select
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy if not exists wallet_cards_insert_own_restaurant
  on public.wallet_cards
  for insert
  with check (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy if not exists wallet_cards_update_own_restaurant
  on public.wallet_cards
  for update
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create policy if not exists wallet_cards_delete_own_restaurant
  on public.wallet_cards
  for delete
  using (
    restaurant_id in (
      select restaurant_id
      from public.restaurant_memberships
      where profile_id = auth.uid()
    )
  );

create or replace function public.touch_wallet_card_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_wallet_card_updated_at on public.wallet_cards;

create trigger trg_touch_wallet_card_updated_at
before update on public.wallet_cards
for each row
execute function public.touch_wallet_card_updated_at();
