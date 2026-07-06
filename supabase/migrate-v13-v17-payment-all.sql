-- 支付相關欄位一次補齊（v13–v17）
-- 若個別 migrate 已執行過，可安全重複執行（IF NOT EXISTS）

-- v13: 商家接受的客人付款方式
alter table merchants
  add column if not exists payment_methods text[] not null default '{card}';

comment on column merchants.payment_methods is 'card | bank_transfer | fps | wechat_pay | alipay';

-- v14: 銀行 / FPS 收款
alter table merchants
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_holder text,
  add column if not exists payout_account_number text,
  add column if not exists payout_fps_id text;

-- v15: 微信 / 支付寶帳號
alter table merchants
  add column if not exists payout_wechat_id text,
  add column if not exists payout_alipay_id text;

-- v16: 微信 / 支付寶收款碼
alter table merchants
  add column if not exists payout_wechat_qr_url text,
  add column if not exists payout_alipay_qr_url text;

-- v17: 訂單付款方式
alter table orders
  add column if not exists payment_method text;

comment on column orders.payment_method is 'card | bank_transfer | fps | wechat_pay | alipay';

notify pgrst, 'reload schema';
