-- Milestone 4: adds the subscriber's *current* charity selection to
-- `subscriptions` (separate from `charity_contributions`, which is the
-- immutable per-billing-period record of what was actually charged).
-- Idempotent — safe to run more than once.

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'charity_id') then
    alter table subscriptions add column charity_id uuid references charities (id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'charity_percentage') then
    alter table subscriptions add column charity_percentage numeric(5, 2) not null default 10
      check (charity_percentage >= 10 and charity_percentage <= 100);
  end if;
end $$;

create index if not exists idx_subscriptions_charity on subscriptions (charity_id);
