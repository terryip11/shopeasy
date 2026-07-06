-- migrate-v8-merchant-subscriptions.sql
-- 商家等級月費訂閱（Stripe）與收入記錄

alter table merchants add column if not exists stripe_subscription_id text;
alter table merchants add column if not exists tier_period_end timestamptz;

create table if not exists merchant_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('premium', 'vip')),
  amount_hkd numeric(10,2) not null,
  currency text not null default 'hkd',
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  payment_type text not null default 'initial'
    check (payment_type in ('initial', 'renewal')),
  status text not null default 'completed'
    check (status in ('completed', 'refunded')),
  paid_at timestamptz not null default now()
);

create unique index if not exists merchant_subscription_payments_invoice_uidx
  on merchant_subscription_payments (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists merchant_subscription_payments_merchant_idx
  on merchant_subscription_payments (merchant_id);

create index if not exists merchant_subscription_payments_paid_at_idx
  on merchant_subscription_payments (paid_at desc);

alter table merchant_subscription_payments enable row level security;

drop policy if exists "subscription_payments_merchant_read" on merchant_subscription_payments;
create policy "subscription_payments_merchant_read" on merchant_subscription_payments
  for select using (auth.uid() = user_id);

drop policy if exists "subscription_payments_super_admin_read" on merchant_subscription_payments;
create policy "subscription_payments_super_admin_read" on merchant_subscription_payments
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'super_admin'
    )
  );
