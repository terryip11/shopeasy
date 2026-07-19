-- 商家取件點（可多個，可指定一個預設）

create table if not exists merchant_pickup_locations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  address text not null,
  contact_name text,
  contact_phone text,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_pickup_locations_name_len check (char_length(trim(name)) >= 1),
  constraint merchant_pickup_locations_address_len check (char_length(trim(address)) >= 5)
);

create index if not exists merchant_pickup_locations_merchant_idx
  on merchant_pickup_locations (merchant_id, sort_order, created_at);

-- 每個商家最多一個預設取件點
create unique index if not exists merchant_pickup_locations_one_default_uidx
  on merchant_pickup_locations (merchant_id)
  where is_default = true;

alter table delivery_jobs
  add column if not exists pickup_location_id uuid references merchant_pickup_locations(id) on delete set null;

-- 從既有預設發貨欄位／營業地址遷移
insert into merchant_pickup_locations (
  merchant_id,
  name,
  address,
  contact_name,
  contact_phone,
  is_default,
  sort_order
)
select
  m.id,
  '預設發貨地',
  trim(coalesce(m.default_pickup_address, m.company_address)),
  nullif(trim(coalesce(m.default_pickup_contact_name, m.contact_name)), ''),
  nullif(trim(coalesce(m.default_pickup_contact_phone, m.contact_phone)), ''),
  true,
  0
from merchants m
where char_length(trim(coalesce(m.default_pickup_address, m.company_address, ''))) >= 5
  and not exists (
    select 1 from merchant_pickup_locations p where p.merchant_id = m.id
  );

alter table merchant_pickup_locations enable row level security;

drop policy if exists "pickup_locations_merchant_select" on merchant_pickup_locations;
drop policy if exists "pickup_locations_merchant_all" on merchant_pickup_locations;

create policy "pickup_locations_merchant_select" on merchant_pickup_locations
  for select using (
    merchant_id in (
      select id from merchants where user_id = auth.uid()
    )
  );

create policy "pickup_locations_merchant_all" on merchant_pickup_locations
  for all using (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  );

comment on table merchant_pickup_locations is '商家取件／發貨點；可多個，其中一個 is_default';
comment on column delivery_jobs.pickup_location_id is '建單時選用的取件點（可空）';
