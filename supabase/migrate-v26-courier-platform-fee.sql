-- 配送員收入平台抽成比例（super_admin 可調）

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

insert into platform_settings (key, value)
values ('courier_platform_fee_rate', '0.10'::jsonb)
on conflict (key) do nothing;

comment on table platform_settings is '平台全局設定（JSON value）';
comment on column platform_settings.key is '設定鍵，如 courier_platform_fee_rate';

alter table delivery_jobs
  add column if not exists platform_fee_rate numeric(5,4),
  add column if not exists platform_fee_amount numeric(10,2) not null default 0,
  add column if not exists courier_payout_net numeric(10,2);

alter table courier_delivery_earnings
  add column if not exists gross_amount numeric(10,2),
  add column if not exists platform_fee_rate numeric(5,4),
  add column if not exists platform_fee_amount numeric(10,2) not null default 0;

-- 既有紀錄：視為無平台抽成，實收=原 amount
update courier_delivery_earnings
set
  gross_amount = coalesce(gross_amount, amount),
  platform_fee_rate = coalesce(platform_fee_rate, 0),
  platform_fee_amount = coalesce(platform_fee_amount, 0)
where gross_amount is null;

update delivery_jobs
set
  courier_payout_net = coalesce(courier_payout_net, courier_fee_total),
  platform_fee_rate = coalesce(platform_fee_rate, 0),
  platform_fee_amount = coalesce(platform_fee_amount, 0)
where courier_fee_total is not null and courier_payout_net is null;

alter table platform_settings enable row level security;

drop policy if exists "platform_settings_super_admin" on platform_settings;
create policy "platform_settings_super_admin" on platform_settings
  for all using (public.is_platform_admin() and exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  ))
  with check (public.is_platform_admin() and exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  ));

drop policy if exists "platform_settings_read" on platform_settings;
create policy "platform_settings_read" on platform_settings
  for select using (true);

notify pgrst, 'reload schema';
