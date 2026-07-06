-- migrate-v5-delivery.sql
-- 配送系統：送餐員 / 送貨員 capability、配送任務、原子搶單

-- =============================================================================
-- 配送區域
-- =============================================================================
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

insert into delivery_zones (name, slug) values
  ('港島', 'hk-island'),
  ('九龍', 'kowloon'),
  ('新界', 'new-territories')
on conflict (slug) do nothing;

-- =============================================================================
-- 用戶能力（可多選，與 profiles.role 分離）
-- =============================================================================
create table if not exists user_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in ('food_courier', 'parcel_courier')),
  granted_at timestamptz default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, capability)
);

create index if not exists user_capabilities_capability_idx on user_capabilities(capability);

-- =============================================================================
-- 配送員資料
-- =============================================================================
create table if not exists courier_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  vehicle_type text check (vehicle_type in ('walk', 'bicycle', 'motorcycle', 'van')),
  preferred_job_type text check (preferred_job_type in ('food', 'parcel', 'both')),
  zone_ids uuid[] not null default '{}',
  is_online boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'suspended')),
  applied_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reject_reason text,
  created_at timestamptz default now()
);

create index if not exists courier_profiles_status_idx on courier_profiles(status);
create index if not exists courier_profiles_online_idx on courier_profiles(is_online) where status = 'active';

-- =============================================================================
-- 配送任務（與 orders 分離）
-- =============================================================================
create table if not exists delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  job_type text not null check (job_type in ('food', 'parcel')),
  zone_id uuid references delivery_zones(id),
  status text not null default 'pending'
    check (status in ('pending', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled')),
  courier_id uuid references auth.users(id),
  pickup_address text,
  dropoff_address text,
  notes text,
  version integer not null default 0,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists delivery_jobs_order_type_unique
  on delivery_jobs(order_id, job_type)
  where status not in ('cancelled', 'failed');

create index if not exists idx_jobs_pending_zone
  on delivery_jobs (zone_id, created_at)
  where status = 'pending';

create index if not exists idx_jobs_type_status
  on delivery_jobs (job_type, status, created_at);

create index if not exists idx_jobs_courier_active
  on delivery_jobs (courier_id, status)
  where status in ('assigned', 'picked_up');

-- =============================================================================
-- 輔助函數
-- =============================================================================
create or replace function public.has_capability(p_capability text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from user_capabilities
    where user_id = auth.uid() and capability = p_capability
  );
$$;

create or replace function public.is_active_courier()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from courier_profiles
    where user_id = auth.uid() and status = 'active'
  );
$$;

-- 原子搶單（僅 active 配送員、具對應 capability、上線中）
create or replace function public.claim_delivery_job(p_job_id uuid)
returns delivery_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job delivery_jobs;
  v_uid uuid := auth.uid();
  v_required_capability text;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not public.is_active_courier() then
    raise exception 'COURIER_NOT_ACTIVE';
  end if;

  select * into v_job from delivery_jobs where id = p_job_id for update;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if v_job.status <> 'pending' or v_job.courier_id is not null then
    raise exception 'JOB_ALREADY_CLAIMED';
  end if;

  v_required_capability := case v_job.job_type
    when 'food' then 'food_courier'
    else 'parcel_courier'
  end;

  if not public.has_capability(v_required_capability) then
    raise exception 'MISSING_CAPABILITY';
  end if;

  if not exists (
    select 1 from courier_profiles
    where user_id = v_uid and is_online = true and status = 'active'
  ) then
    raise exception 'COURIER_OFFLINE';
  end if;

  update delivery_jobs
  set courier_id = v_uid,
      status = 'assigned',
      assigned_at = now(),
      version = version + 1
  where id = p_job_id
    and status = 'pending'
    and courier_id is null
  returning * into v_job;

  return v_job;
end;
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table delivery_zones enable row level security;
alter table user_capabilities enable row level security;
alter table courier_profiles enable row level security;
alter table delivery_jobs enable row level security;

drop policy if exists "zones_public_read" on delivery_zones;
create policy "zones_public_read" on delivery_zones for select using (true);

drop policy if exists "capabilities_read_own" on user_capabilities;
create policy "capabilities_read_own" on user_capabilities
  for select using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "capabilities_super_admin_write" on user_capabilities;
create policy "capabilities_super_admin_write" on user_capabilities
  for all using (public.is_super_admin());

drop policy if exists "courier_profile_read_own" on courier_profiles;
create policy "courier_profile_read_own" on courier_profiles
  for select using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "courier_profile_insert_own" on courier_profiles;
create policy "courier_profile_insert_own" on courier_profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "courier_profile_update_own" on courier_profiles;
create policy "courier_profile_update_own" on courier_profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "courier_profile_admin_write" on courier_profiles;
create policy "courier_profile_admin_write" on courier_profiles
  for all using (public.is_platform_admin());

drop policy if exists "jobs_courier_read_available" on delivery_jobs;
create policy "jobs_courier_read_available" on delivery_jobs
  for select using (
    status = 'pending'
    or courier_id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1 from orders o
      join merchants m on m.id = o.merchant_id
      where o.id = delivery_jobs.order_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "jobs_merchant_insert" on delivery_jobs;
create policy "jobs_merchant_insert" on delivery_jobs
  for insert with check (
    exists (
      select 1 from orders o
      join merchants m on m.id = o.merchant_id
      where o.id = order_id and m.user_id = auth.uid()
    )
    or public.is_platform_admin()
  );

drop policy if exists "jobs_courier_update_assigned" on delivery_jobs;
create policy "jobs_courier_update_assigned" on delivery_jobs
  for update using (courier_id = auth.uid() or public.is_platform_admin());
