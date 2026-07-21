-- v54: 商家直付分享員／配送員（標記已付＋配送員 FPS）
-- 相依：v20 courier earnings、v42 affiliate、v43 promoter payout

-- 1. 配送員收款 FPS（供商家直付）
alter table courier_profiles
  add column if not exists payout_account_holder text,
  add column if not exists payout_fps_id text;

comment on column courier_profiles.payout_account_holder is 'FPS 收款人姓名（商家直付工資用）';
comment on column courier_profiles.payout_fps_id is '轉數快識別碼（電話／電郵／FPS ID）';

-- 2. 分享員收益：商家已付標記
alter table promoter_earnings
  add column if not exists merchant_paid_at timestamptz,
  add column if not exists merchant_paid_by uuid references auth.users(id) on delete set null,
  add column if not exists merchant_paid_note text;

create index if not exists promoter_earnings_merchant_pending_idx
  on promoter_earnings (merchant_id, status, created_at desc)
  where merchant_paid_at is null and status in ('pending', 'confirmed');

comment on column promoter_earnings.merchant_paid_at is '商家標記已直付分享員之時間';

-- 3. 配送工資：商家已付標記
alter table courier_delivery_earnings
  add column if not exists merchant_paid_at timestamptz,
  add column if not exists merchant_paid_by uuid references auth.users(id) on delete set null,
  add column if not exists merchant_paid_note text;

create index if not exists courier_earnings_merchant_paid_idx
  on courier_delivery_earnings (merchant_paid_at, earned_at desc);

comment on column courier_delivery_earnings.merchant_paid_at is '商家標記已直付配送員之時間';

-- 4. 商家可讀取自家相關應付明細（寫入仍走 service role API）
drop policy if exists "promoter_earnings_merchant_read" on promoter_earnings;
create policy "promoter_earnings_merchant_read" on promoter_earnings
  for select using (
    exists (
      select 1 from merchants m
      where m.id = promoter_earnings.merchant_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "courier_earnings_merchant_read" on courier_delivery_earnings;
create policy "courier_earnings_merchant_read" on courier_delivery_earnings
  for select using (
    exists (
      select 1 from orders o
      join merchants m on m.id = o.merchant_id
      where o.id = courier_delivery_earnings.order_id
        and m.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
