-- 商家收款資料（銀行轉帳 / 轉數快）

alter table merchants
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_holder text,
  add column if not exists payout_account_number text,
  add column if not exists payout_fps_id text;

comment on column merchants.payout_bank_name is '收款銀行名稱';
comment on column merchants.payout_account_holder is '收款戶口持有人';
comment on column merchants.payout_account_number is '收款銀行戶口號碼';
comment on column merchants.payout_fps_id is '轉數快識別碼（電話 / 電郵 / FPS ID）';

notify pgrst, 'reload schema';
