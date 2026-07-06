-- 買家線下付款回報（待商家確認）
alter table orders
  add column if not exists buyer_payment_claimed_at timestamptz;

comment on column orders.buyer_payment_claimed_at is '買家已回報完成線下付款，待商家核對';
