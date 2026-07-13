-- 分享員（推廣）系統 MVP

-- 1. 分享員角色
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('buyer', 'merchant', 'admin', 'super_admin', 'accountant', 'promoter'));

-- 2. 平台分享設定
insert into platform_settings (key, value)
values
  ('affiliate_enabled', 'true'::jsonb),
  ('affiliate_platform_cut_rate', '0.2'::jsonb),
  ('affiliate_attribution_days', '30'::jsonb),
  ('affiliate_min_commission_rate', '0.05'::jsonb),
  ('affiliate_max_commission_rate', '0.3'::jsonb)
on conflict (key) do nothing;

-- 3. 商家分享方案
create table if not exists merchant_affiliate_settings (
  merchant_id uuid primary key references merchants(id) on delete cascade,
  enabled boolean not null default false,
  default_commission_rate numeric(6,4) not null default 0.1
    check (default_commission_rate >= 0 and default_commission_rate <= 1),
  updated_at timestamptz not null default now()
);

comment on table merchant_affiliate_settings is '商家分享推廣計劃設定';

-- 4. 商品分享欄位
alter table products
  add column if not exists share_enabled boolean not null default false;

alter table products
  add column if not exists commission_rate numeric(6,4)
    check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 1));

comment on column products.share_enabled is '是否允許分享員推廣此商品';
comment on column products.commission_rate is '覆寫商家預設佣金比例（0–1）';

-- 5. 分享連結
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  promoter_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  merchant_id uuid not null references merchants(id) on delete cascade,
  click_count integer not null default 0 check (click_count >= 0),
  created_at timestamptz not null default now(),
  unique (promoter_id, product_id)
);

create index if not exists share_links_promoter_id_idx on share_links (promoter_id);
create index if not exists share_links_product_id_idx on share_links (product_id);
create index if not exists share_links_merchant_id_idx on share_links (merchant_id);

-- 6. 訂單歸屬與佣金快照
alter table orders
  add column if not exists share_link_id uuid references share_links(id) on delete set null;

alter table orders
  add column if not exists promoter_id uuid references auth.users(id) on delete set null;

alter table orders
  add column if not exists affiliate_commission_rate numeric(6,4);

alter table orders
  add column if not exists affiliate_commission_amount numeric(10,2);

alter table orders
  add column if not exists affiliate_platform_fee numeric(10,2);

alter table orders
  add column if not exists affiliate_promoter_net numeric(10,2);

alter table orders
  add column if not exists affiliate_status text
    check (affiliate_status is null or affiliate_status in ('pending', 'confirmed', 'reversed'));

-- 7. 財務分錄擴充
alter table order_ledger
  add column if not exists affiliate_commission_amount numeric(10,2) not null default 0;

alter table order_ledger
  add column if not exists affiliate_platform_fee numeric(10,2) not null default 0;

alter table order_ledger
  add column if not exists promoter_id uuid references auth.users(id) on delete set null;

-- 8. 分享員收益明細
create table if not exists promoter_earnings (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references orders(id) on delete cascade,
  merchant_id uuid not null references merchants(id) on delete cascade,
  share_link_id uuid references share_links(id) on delete set null,
  commission_base numeric(10,2) not null,
  commission_rate numeric(6,4) not null,
  commission_gross numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'reversed', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists promoter_earnings_promoter_id_idx on promoter_earnings (promoter_id);
create index if not exists promoter_earnings_status_idx on promoter_earnings (status);

-- 9. RLS
alter table merchant_affiliate_settings enable row level security;
alter table share_links enable row level security;
alter table promoter_earnings enable row level security;

drop policy if exists "merchant_affiliate_settings_public_read" on merchant_affiliate_settings;
create policy "merchant_affiliate_settings_public_read" on merchant_affiliate_settings
  for select using (true);

drop policy if exists "merchant_affiliate_settings_owner_write" on merchant_affiliate_settings;
create policy "merchant_affiliate_settings_owner_write" on merchant_affiliate_settings
  for all using (
    exists (
      select 1 from merchants m
      where m.id = merchant_affiliate_settings.merchant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from merchants m
      where m.id = merchant_affiliate_settings.merchant_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "share_links_promoter_read" on share_links;
create policy "share_links_promoter_read" on share_links
  for select using (promoter_id = auth.uid());

drop policy if exists "share_links_public_read_by_code" on share_links;
create policy "share_links_public_read_by_code" on share_links
  for select using (true);

drop policy if exists "share_links_promoter_insert" on share_links;
create policy "share_links_promoter_insert" on share_links
  for insert with check (promoter_id = auth.uid());

drop policy if exists "promoter_earnings_own_read" on promoter_earnings;
create policy "promoter_earnings_own_read" on promoter_earnings
  for select using (promoter_id = auth.uid());

drop policy if exists "promoter_earnings_finance_read" on promoter_earnings;
create policy "promoter_earnings_finance_read" on promoter_earnings
  for select using (public.is_finance_staff());

notify pgrst, 'reload schema';
