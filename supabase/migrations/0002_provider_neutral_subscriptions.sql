-- Aligns an existing database (migrated from an early version of
-- 0001_init.sql, back when the payment gateway was still Stripe-specific)
-- with the current schema: provider-neutral column names on `subscriptions`
-- / `subscription_events`, plus the `payment_provider` column added when the
-- app moved to a pluggable PaymentProvider (mock / razorpay). Safe to run
-- once; guarded so re-running it is a no-op.

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'stripe_customer_id') then
    alter table subscriptions rename column stripe_customer_id to provider_customer_id;
  end if;

  if exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'stripe_subscription_id') then
    alter table subscriptions rename column stripe_subscription_id to provider_subscription_id;
  end if;

  if exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'razorpay_customer_id') then
    alter table subscriptions rename column razorpay_customer_id to provider_customer_id;
  end if;

  if exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'razorpay_subscription_id') then
    alter table subscriptions rename column razorpay_subscription_id to provider_subscription_id;
  end if;

  if exists (select 1 from information_schema.columns where table_name = 'subscription_events' and column_name = 'stripe_event_id') then
    alter table subscription_events rename column stripe_event_id to provider_event_id;
  end if;

  if exists (select 1 from information_schema.columns where table_name = 'subscription_events' and column_name = 'razorpay_event_id') then
    alter table subscription_events rename column razorpay_event_id to provider_event_id;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'payment_provider') then
    alter table subscriptions add column payment_provider text not null default 'mock' check (payment_provider in ('mock', 'razorpay'));
  end if;
end $$;
