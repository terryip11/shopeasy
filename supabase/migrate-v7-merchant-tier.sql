-- migrate-v7-merchant-tier.sql
-- 商家等級：普通 / 高級 / 尊貴，含升級申請與審批

alter table merchants add column if not exists tier text not null default 'basic'
  check (tier in ('basic', 'premium', 'vip'));

create table if not exists merchant_tier_upgrades (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_tier text not null check (current_tier in ('basic', 'premium', 'vip')),
  requested_tier text not null check (requested_tier in ('premium', 'vip')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,
  reject_reason text,
  applied_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create unique index if not exists merchant_tier_upgrades_one_pending
  on merchant_tier_upgrades (merchant_id)
  where status = 'pending';

create index if not exists merchant_tier_upgrades_status_idx
  on merchant_tier_upgrades (status);

-- RLS
alter table merchant_tier_upgrades enable row level security;

drop policy if exists "tier_upgrades_merchant_read" on merchant_tier_upgrades;
create policy "tier_upgrades_merchant_read" on merchant_tier_upgrades
  for select using (auth.uid() = user_id);

drop policy if exists "tier_upgrades_merchant_insert" on merchant_tier_upgrades;
create policy "tier_upgrades_merchant_insert" on merchant_tier_upgrades
  for insert with check (auth.uid() = user_id);

drop policy if exists "tier_upgrades_admin_read" on merchant_tier_upgrades;
create policy "tier_upgrades_admin_read" on merchant_tier_upgrades
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );
