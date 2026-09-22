-- Digital Heroes — initial schema
-- Run against a fresh Supabase Postgres project (via `supabase db push` or the SQL editor).
-- This file is authoritative; server/prisma/schema.prisma mirrors it for the app's ORM layer.
-- Money is stored as integer paise (INR minor units) throughout — never float.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type role as enum ('SUBSCRIBER', 'ADMIN');
create type subscription_plan as enum ('MONTHLY', 'YEARLY');
create type subscription_status as enum ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'LAPSED', 'INCOMPLETE');
create type subscription_event_type as enum ('CHECKOUT_COMPLETED', 'RENEWED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED');
create type draw_method as enum ('RANDOM', 'ALGORITHMIC');
create type draw_status as enum ('DRAFT', 'SIMULATED', 'PUBLISHED');
create type match_tier as enum ('FIVE', 'FOUR', 'THREE');
create type verification_status as enum ('AWAITING_PROOF', 'SUBMITTED', 'APPROVED', 'REJECTED');
create type payout_status as enum ('PENDING', 'PAID');

-- ---------------------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role role not null default 'SUBSCRIBER',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new Supabase auth user is created.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------------

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  plan subscription_plan not null,
  status subscription_status not null default 'INCOMPLETE',
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  payment_provider text not null default 'mock' check (payment_provider in ('mock', 'razorpay')),
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user on subscriptions (user_id);
create index idx_subscriptions_status on subscriptions (status);

-- A user may only have one ACTIVE subscription at a time.
create unique index uniq_one_active_subscription_per_user
  on subscriptions (user_id)
  where (status = 'ACTIVE');

create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id),
  type subscription_event_type not null,
  provider_event_id text unique, -- webhook idempotency key
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_subscription_events_subscription on subscription_events (subscription_id);

-- ---------------------------------------------------------------------------
-- CHARITY
-- ---------------------------------------------------------------------------

create table charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text not null,
  description text not null,
  logo_url text,
  cover_image_url text,
  website_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table charity_events (
  id uuid primary key default gen_random_uuid(),
  charity_id uuid not null references charities (id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

create index idx_charity_events_charity on charity_events (charity_id);

create table charity_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  subscription_id uuid not null references subscriptions (id),
  charity_id uuid not null references charities (id),
  percentage numeric(5, 2) not null check (percentage >= 10 and percentage <= 100),
  amount_paise integer not null check (amount_paise >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique (subscription_id, period_start)
);

create index idx_charity_contributions_charity on charity_contributions (charity_id);
create index idx_charity_contributions_user on charity_contributions (user_id);

create table donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  charity_id uuid not null references charities (id),
  amount_paise integer not null check (amount_paise > 0),
  created_at timestamptz not null default now()
);

create index idx_donations_charity on donations (charity_id);
create index idx_donations_user on donations (user_id);

-- ---------------------------------------------------------------------------
-- SCORES (Stableford, rolling window of 5 enforced in application layer;
-- one-per-date and range enforced here at the database level)
-- ---------------------------------------------------------------------------

create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  strokes integer not null check (strokes >= 1 and strokes <= 45),
  played_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, played_on)
);

create index idx_scores_user on scores (user_id);

-- ---------------------------------------------------------------------------
-- DRAW ENGINE
-- ---------------------------------------------------------------------------

create table draw_configurations (
  id uuid primary key default gen_random_uuid(),
  method draw_method not null default 'RANDOM',
  tier5_pool_pct numeric(5, 2) not null default 40,
  tier4_pool_pct numeric(5, 2) not null default 35,
  tier3_pool_pct numeric(5, 2) not null default 25,
  prize_pool_pct_of_subscription numeric(5, 2) not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (tier5_pool_pct + tier4_pool_pct + tier3_pool_pct = 100)
);

create table draws (
  id uuid primary key default gen_random_uuid(),
  period_label text not null unique, -- e.g. '2026-09'
  method draw_method not null,
  status draw_status not null default 'DRAFT',
  eligible_subscriber_count integer,
  prize_pool_paise integer,
  tier5_pool_paise integer,
  tier4_pool_paise integer,
  tier3_pool_paise integer,
  jackpot_rollover_in_paise integer not null default 0,
  jackpot_rollover_out_paise integer,
  winning_numbers integer[],
  seed text,
  published_at timestamptz,
  published_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table draw_simulations (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws (id) on delete cascade,
  run_by uuid not null references profiles (id),
  seed text not null,
  winning_numbers integer[] not null,
  result_summary jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_draw_simulations_draw on draw_simulations (draw_id);

create table draw_tickets (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws (id) on delete cascade,
  user_id uuid not null references profiles (id),
  numbers integer[] not null,
  weight integer not null default 1,
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);

create index idx_draw_tickets_draw on draw_tickets (draw_id);

create table draw_winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws (id),
  user_id uuid not null references profiles (id),
  ticket_id uuid not null references draw_tickets (id),
  match_tier match_tier not null,
  prize_amount_paise integer not null check (prize_amount_paise >= 0),
  created_at timestamptz not null default now()
);

create index idx_draw_winners_draw on draw_winners (draw_id);
create index idx_draw_winners_user on draw_winners (user_id);

-- Published draws are immutable: once status = PUBLISHED, block further
-- column changes on the draw row itself (winners/tickets are append-only
-- child rows created as part of the same publish transaction).
create or replace function prevent_published_draw_mutation()
returns trigger as $$
begin
  if old.status = 'PUBLISHED' then
    raise exception 'Published draws are immutable (draw %)', old.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_published_draw_mutation
  before update on draws
  for each row execute procedure prevent_published_draw_mutation();

-- ---------------------------------------------------------------------------
-- WINNER VERIFICATION & PAYOUTS
-- ---------------------------------------------------------------------------

create table winner_verifications (
  id uuid primary key default gen_random_uuid(),
  draw_winner_id uuid not null unique references draw_winners (id),
  status verification_status not null default 'AWAITING_PROOF',
  proof_file_path text,
  review_notes text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  draw_winner_id uuid not null unique references draw_winners (id),
  status payout_status not null default 'PENDING',
  amount_paise integer not null check (amount_paise >= 0),
  paid_by uuid references profiles (id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  actor_role role,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);
create index idx_audit_logs_actor on audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Defense in depth: the Express API is the primary authorization boundary
-- (using the Supabase service-role key), but RLS is enabled so that any
-- direct client -> Supabase access (e.g. Storage-adjacent reads, future
-- client-side Supabase usage) cannot bypass ownership/role rules.
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table subscription_events enable row level security;
alter table charities enable row level security;
alter table charity_events enable row level security;
alter table charity_contributions enable row level security;
alter table donations enable row level security;
alter table scores enable row level security;
alter table draws enable row level security;
alter table draw_tickets enable row level security;
alter table draw_winners enable row level security;
alter table winner_verifications enable row level security;
alter table payouts enable row level security;
alter table audit_logs enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  );
$$ language sql stable security definer;

create policy "profiles_self_or_admin_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_self_update" on profiles for update
  using (id = auth.uid() or is_admin());

create policy "subscriptions_self_or_admin_select" on subscriptions for select
  using (user_id = auth.uid() or is_admin());
create policy "subscriptions_admin_write" on subscriptions for all
  using (is_admin()) with check (is_admin());

create policy "subscription_events_admin_only" on subscription_events for select
  using (is_admin());

create policy "charities_public_read_active" on charities for select
  using (is_active or is_admin());
create policy "charities_admin_write" on charities for insert with check (is_admin());
create policy "charities_admin_update" on charities for update using (is_admin());
create policy "charities_admin_delete" on charities for delete using (is_admin());

create policy "charity_events_public_read" on charity_events for select using (true);
create policy "charity_events_admin_write" on charity_events for all
  using (is_admin()) with check (is_admin());

create policy "charity_contributions_self_or_admin" on charity_contributions for select
  using (user_id = auth.uid() or is_admin());

create policy "donations_self_or_admin" on donations for select
  using (user_id = auth.uid() or is_admin());
create policy "donations_self_insert" on donations for insert
  with check (user_id = auth.uid());

create policy "scores_self_crud_select" on scores for select
  using (user_id = auth.uid() or is_admin());
create policy "scores_self_insert" on scores for insert
  with check (user_id = auth.uid() or is_admin());
create policy "scores_self_update" on scores for update
  using (user_id = auth.uid() or is_admin());
create policy "scores_self_delete" on scores for delete
  using (user_id = auth.uid() or is_admin());

create policy "draws_public_read_published" on draws for select
  using (status = 'PUBLISHED' or is_admin());
create policy "draws_admin_write" on draws for all
  using (is_admin()) with check (is_admin());

create policy "draw_tickets_self_or_admin" on draw_tickets for select
  using (user_id = auth.uid() or is_admin());

create policy "draw_winners_self_or_admin" on draw_winners for select
  using (user_id = auth.uid() or is_admin());

create policy "winner_verifications_self_or_admin_select" on winner_verifications for select
  using (
    is_admin() or exists (
      select 1 from draw_winners w
      where w.id = winner_verifications.draw_winner_id and w.user_id = auth.uid()
    )
  );
create policy "winner_verifications_admin_write" on winner_verifications for all
  using (is_admin()) with check (is_admin());

create policy "payouts_self_or_admin_select" on payouts for select
  using (
    is_admin() or exists (
      select 1 from draw_winners w
      where w.id = payouts.draw_winner_id and w.user_id = auth.uid()
    )
  );

create policy "audit_logs_admin_only" on audit_logs for select using (is_admin());
