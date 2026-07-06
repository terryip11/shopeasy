-- 買家收貨地址簿

create table if not exists buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  name text not null,
  phone text not null,
  address text not null,
  zone_id uuid not null references delivery_zones(id),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_addresses_user_id_idx on buyer_addresses(user_id);

create unique index if not exists buyer_addresses_one_default_per_user
  on buyer_addresses (user_id)
  where is_default = true;

comment on table buyer_addresses is '買家收貨地址簿';
comment on column buyer_addresses.label is '地址標籤，如：家、公司';

alter table buyer_addresses enable row level security;

drop policy if exists "buyer_addresses_own" on buyer_addresses;
create policy "buyer_addresses_own" on buyer_addresses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
