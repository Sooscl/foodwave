alter table public.customers
  add column if not exists customer_score integer,
  add column if not exists customer_status text,
  add column if not exists average_ticket numeric(12,2),
  add column if not exists lifetime_value numeric(12,2);

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

drop trigger if exists trg_update_customer_business_metrics on public.customers;

create trigger trg_update_customer_business_metrics
before insert or update of total_visits, total_spent, last_visit on public.customers
for each row
execute function public.update_customer_business_metrics();

update public.customers
set total_visits = coalesce(total_visits, 0),
    total_spent = coalesce(total_spent, 0),
    last_visit = last_visit
where id is not null;
