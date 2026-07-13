-- 分享員 FPS 收款資料（佣金撥款用）

create table if not exists promoter_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payout_account_holder text not null,
  payout_fps_id text not null,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table promoter_profiles is '分享員收款資料';
comment on column promoter_profiles.payout_account_holder is 'FPS 收款人姓名（與銀行/FPS 登記一致）';
comment on column promoter_profiles.payout_fps_id is '轉數快識別碼（電話 / 電郵 / FPS ID）';

alter table promoter_profiles enable row level security;

drop policy if exists "promoter_profiles_own_read" on promoter_profiles;
create policy "promoter_profiles_own_read" on promoter_profiles
  for select using (user_id = auth.uid());

drop policy if exists "promoter_profiles_own_update" on promoter_profiles;
create policy "promoter_profiles_own_update" on promoter_profiles
  for update using (user_id = auth.uid());

drop policy if exists "promoter_profiles_finance_read" on promoter_profiles;
create policy "promoter_profiles_finance_read" on promoter_profiles
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('super_admin', 'accountant', 'admin')
    )
  );
