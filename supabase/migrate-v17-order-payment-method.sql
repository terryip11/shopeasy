-- 訂單付款方式

alter table orders
  add column if not exists payment_method text;

comment on column orders.payment_method is 'card | bank_transfer | fps | wechat_pay | alipay';

notify pgrst, 'reload schema';
