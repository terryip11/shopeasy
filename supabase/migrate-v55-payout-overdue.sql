-- v55: 商家直付逾期催付／限制／未付回報
-- 相依：v54 merchant-direct-payout

-- 1. 商家因逾期未付而被限制建立新配送
alter table merchants
  add column if not exists payout_delivery_blocked_at timestamptz,
  add column if not exists payout_delivery_block_reason text;

comment on column merchants.payout_delivery_blocked_at is '因逾期未付分享員／配送員而禁止新建配送任務之時間';
comment on column merchants.payout_delivery_block_reason is '限制原因說明';

-- 2. 門檻設定（天）
insert into platform_settings (key, value)
values
  ('payout_overdue_remind_days', to_jsonb(3)),
  ('payout_overdue_block_days', to_jsonb(7))
on conflict (key) do nothing;

-- 3. 分享員／配送員回報商家未付
create table if not exists payout_unpaid_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_role text not null check (reporter_role in ('promoter', 'courier')),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  earning_type text not null check (earning_type in ('promoter', 'courier')),
  earning_id uuid not null,
  merchant_id uuid not null references merchants(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  note text,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  admin_note text
);

create unique index if not exists payout_unpaid_reports_open_unique
  on payout_unpaid_reports (earning_type, earning_id)
  where status = 'open';

create index if not exists payout_unpaid_reports_merchant_idx
  on payout_unpaid_reports (merchant_id, status, created_at desc);

create index if not exists payout_unpaid_reports_status_idx
  on payout_unpaid_reports (status, created_at desc);

comment on table payout_unpaid_reports is '分享員／配送員回報商家未付佣金或工資';

alter table payout_unpaid_reports enable row level security;

drop policy if exists "payout_reports_reporter_read" on payout_unpaid_reports;
create policy "payout_reports_reporter_read" on payout_unpaid_reports
  for select using (
    reporter_id = auth.uid()
    or public.is_finance_staff()
    or public.is_platform_admin()
  );

drop policy if exists "payout_reports_reporter_insert" on payout_unpaid_reports;
create policy "payout_reports_reporter_insert" on payout_unpaid_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists "payout_reports_finance_write" on payout_unpaid_reports;
create policy "payout_reports_finance_write" on payout_unpaid_reports
  for update using (public.is_finance_staff() or public.is_platform_admin());

notify pgrst, 'reload schema';
