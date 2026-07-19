-- supabase/schema.sql
-- ShopEasy 資料庫結構與 RLS 策略
-- 適用：全新 Supabase 專案（可安全重複執行 policy / function 部分）

-- =============================================================================
-- 表結構
-- =============================================================================

-- 用戶資料（角色：buyer / merchant / admin / super_admin）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer'
    check (role in ('buyer', 'merchant', 'admin', 'super_admin')),
  display_name text,
  created_at timestamptz default now()
);

-- 分類表
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 100,
  created_at timestamptz default now()
);

-- 商家表（含審批狀態）
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'suspended')),
  applied_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reject_reason text,
  contact_name text,
  contact_phone text,
  contact_email text,
  company_address text,
  br_image_url text,
  ci_image_url text,
  data_consent_at timestamptz,
  logo_url text,
  payment_methods text[] not null default '{card}',
  payout_bank_name text,
  payout_account_holder text,
  payout_account_number text,
  payout_fps_id text,
  payout_wechat_id text,
  payout_wechat_qr_url text,
  payout_alipay_id text,
  payout_alipay_qr_url text,
  created_at timestamptz default now()
);

-- 產品表
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  category_id uuid references categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null,
  images text[] default '{}',
  stock integer not null default 0 check (stock >= 0),
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz default now()
);

-- 訂單表
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  merchant_id uuid references merchants(id),
  items jsonb not null default '[]',
  total numeric(10,2) not null,
  status text default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'cancelled', 'refunded', 'refund_requested')),
  stripe_payment_id text,
  tracking_number text,
  created_at timestamptz default now()
);

-- Admin 操作審計日誌
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}',
  created_at timestamptz default now()
);

-- 約束與索引（若表已存在則補上）
create unique index if not exists merchants_user_id_unique on merchants(user_id);
create index if not exists merchants_status_idx on merchants(status);
create index if not exists products_merchant_id_idx on products(merchant_id);
create index if not exists products_status_idx on products(status);
create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_merchant_id_idx on orders(merchant_id);

-- =============================================================================
-- 函數與觸發器
-- =============================================================================

-- 新用戶自動建立 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'buyer',
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 平台管理員檢查（admin + super_admin）
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

-- 禁止用戶自行修改 role（僅 super_admin 或 service_role 可改）
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_super_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception '無權限修改角色';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on profiles;
create trigger prevent_profile_role_change
  before update on profiles
  for each row execute function public.prevent_profile_role_change();

-- =============================================================================
-- RLS
-- =============================================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table merchants enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table admin_audit_log enable row level security;

-- profiles
drop policy if exists "profiles_read_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_admin_read" on profiles;
drop policy if exists "profiles_super_admin_write" on profiles;

create policy "profiles_read_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_admin_read" on profiles
  for select using (public.is_platform_admin());

create policy "profiles_super_admin_write" on profiles
  for all using (public.is_super_admin());

-- categories
drop policy if exists "categories_public_read" on categories;
drop policy if exists "categories_admin_write" on categories;

create policy "categories_public_read" on categories
  for select using (true);

create policy "categories_admin_write" on categories
  for all using (public.is_platform_admin());

-- merchants
drop policy if exists "merchants_public_active" on merchants;
drop policy if exists "merchants_owner_select" on merchants;
drop policy if exists "merchants_owner_insert" on merchants;
drop policy if exists "merchants_owner_update_application" on merchants;
drop policy if exists "merchants_owner_update_profile" on merchants;
drop policy if exists "merchants_admin_all" on merchants;

create policy "merchants_public_active" on merchants
  for select using (status = 'active');

create policy "merchants_owner_select" on merchants
  for select using (user_id = auth.uid());

create policy "merchants_owner_insert" on merchants
  for insert with check (user_id = auth.uid() and status = 'pending');

-- 店主可更新申請（pending 修改資料，或 rejected 重新提交為 pending）
create policy "merchants_owner_update_application" on merchants
  for update
  using (user_id = auth.uid() and status in ('pending', 'rejected'))
  with check (user_id = auth.uid() and status = 'pending');

create policy "merchants_owner_update_profile" on merchants
  for update
  using (user_id = auth.uid() and status = 'active')
  with check (user_id = auth.uid() and status = 'active');

create policy "merchants_admin_all" on merchants
  for all using (public.is_platform_admin());

-- products
drop policy if exists "products_public_read" on products;
drop policy if exists "products_merchant_all" on products;
drop policy if exists "products_admin_all" on products;

create policy "products_public_read" on products
  for select using (status = 'published');

create policy "products_merchant_all" on products
  for all using (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  );

create policy "products_admin_all" on products
  for all using (public.is_platform_admin());

-- orders
drop policy if exists "orders_buyer_select" on orders;
drop policy if exists "orders_buyer_insert" on orders;
drop policy if exists "orders_merchant_select" on orders;
drop policy if exists "orders_merchant_update" on orders;
drop policy if exists "orders_admin_all" on orders;

create policy "orders_buyer_select" on orders
  for select using (user_id = auth.uid());

create policy "orders_buyer_insert" on orders
  for insert with check (user_id = auth.uid());

drop policy if exists "orders_buyer_update_refund" on orders;
create policy "orders_buyer_update_refund" on orders
  for update
  using (user_id = auth.uid() and status in ('paid', 'shipped'))
  with check (user_id = auth.uid() and status = 'refund_requested');

create policy "orders_merchant_select" on orders
  for select using (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  );

create policy "orders_merchant_update" on orders
  for update using (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  );

create policy "orders_admin_all" on orders
  for all using (public.is_platform_admin());

-- audit log
drop policy if exists "audit_super_admin_read" on admin_audit_log;

create policy "audit_super_admin_read" on admin_audit_log
  for select using (public.is_super_admin());

-- =============================================================================
-- 從舊版遷移（已有資料庫、表已存在時單獨執行）
-- =============================================================================
-- alter table profiles drop constraint if exists profiles_role_check;
-- alter table profiles add constraint profiles_role_check
--   check (role in ('buyer', 'merchant', 'admin', 'super_admin'));
-- alter table merchants add column if not exists status text not null default 'pending';
-- alter table merchants add column if not exists applied_at timestamptz default now();
-- alter table merchants add column if not exists reviewed_at timestamptz;
-- alter table merchants add column if not exists reviewed_by uuid references auth.users(id);
-- alter table merchants add column if not exists reject_reason text;
-- update merchants set status = 'active' where status is null;
-- create unique index if not exists merchants_user_id_unique on merchants(user_id);
-- alter table products add column if not exists stock integer not null default 0 check (stock >= 0);
-- alter table orders add column if not exists tracking_number text;
-- alter table orders drop constraint if exists orders_status_check;
-- 配送系統：請執行 supabase/migrate-v5-delivery.sql
