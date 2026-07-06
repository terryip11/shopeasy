-- 微信支付、支付寶收款資料

alter table merchants
  add column if not exists payout_wechat_id text,
  add column if not exists payout_alipay_id text;

comment on column merchants.payout_wechat_id is '微信支付收款帳號（WeChat ID / 商戶號）';
comment on column merchants.payout_alipay_id is '支付寶收款帳號（手機 / 電郵）';

notify pgrst, 'reload schema';
