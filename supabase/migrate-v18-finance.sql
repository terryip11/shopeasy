-- 財務分錄：訂單 GMV、Stripe 費、平台服務費、商家應得

create table if not exists order_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  merchant_id uuid not null references merchants(id) on delete cascade,
  gmv numeric(10,2) not null,
  payment_method text not null default 'card',
  currency text not null default 'hkd',
  stripe_fee numeric(10,2) not null default 0,
  platform_fee_rate numeric(6,4) not null,
  platform_fee_amount numeric(10,2) not null,
  infra_cost_allocated numeric(10,2) not null default 0,
  delivery_cost numeric(10,2) not null default 0,
  merchant_net numeric(10,2) not null,
  platform_net numeric(10,2) not null,
  settlement_status text not null default 'recorded'
    check (settlement_status in ('recorded', 'settled', 'reversed')),
  paid_at timestamptz not null default now(),
  created_at timestamptz default now(),
  unique (order_id)
);

create index if not exists order_ledger_merchant_id_idx on order_ledger (merchant_id);
create index if not exists order_ledger_paid_at_idx on order_ledger (paid_at desc);
create index if not exists order_ledger_settlement_status_idx on order_ledger (settlement_status);

comment on table order_ledger is '訂單財務分錄（付款成功時寫入）';
comment on column order_ledger.platform_fee_rate is '平台服務費率，如 0.02 = 2%';
comment on column order_ledger.merchant_net is 'GMV - stripe_fee - platform_fee - infra - delivery';
comment on column order_ledger.platform_net is 'platform_fee - infra_cost_allocated';

-- 平台月度固定成本（Supabase、R2 等），用於分攤至每單

create table if not exists platform_monthly_costs (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  supabase_cost numeric(10,2) not null default 0,
  r2_cost numeric(10,2) not null default 0,
  stripe_fees_reported numeric(10,2) not null default 0,
  other_cost numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table platform_monthly_costs is 'month 為該月 1 日，如 2026-06-01';
comment on column platform_monthly_costs.stripe_fees_reported is 'Stripe 帳單實際手續費（對帳用，可選）';

alter table order_ledger enable row level security;
alter table platform_monthly_costs enable row level security;

drop policy if exists "order_ledger_super_admin_read" on order_ledger;
create policy "order_ledger_super_admin_read" on order_ledger
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

drop policy if exists "order_ledger_merchant_read_own" on order_ledger;
create policy "order_ledger_merchant_read_own" on order_ledger
  for select using (
    exists (
      select 1 from merchants m
      where m.id = order_ledger.merchant_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "platform_monthly_costs_super_admin_all" on platform_monthly_costs;
create policy "platform_monthly_costs_super_admin_all" on platform_monthly_costs
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'super_admin'
    )
  );

notify pgrst, 'reload schema';
