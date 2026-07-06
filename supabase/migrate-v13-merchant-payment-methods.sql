-- 商家支援的支付方式

alter table merchants
  add column if not exists payment_methods text[] not null default '{card}';

comment on column merchants.payment_methods is 'card | bank_transfer | fps';

notify pgrst, 'reload schema';
