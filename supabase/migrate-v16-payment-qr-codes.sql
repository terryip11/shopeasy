-- 微信 / 支付寶收款二維碼

alter table merchants
  add column if not exists payout_wechat_qr_url text,
  add column if not exists payout_alipay_qr_url text;

comment on column merchants.payout_wechat_qr_url is '微信收款碼圖片 URL';
comment on column merchants.payout_alipay_qr_url is '支付寶收款碼圖片 URL';

notify pgrst, 'reload schema';
