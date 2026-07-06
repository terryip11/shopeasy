-- 商品級結帳運費與配送員工資覆寫

alter table products
  add column if not exists checkout_shipping_fee numeric(10,2) not null default 0,
  add column if not exists courier_fee numeric(10,2);

comment on column products.checkout_shipping_fee is '向買家收取的每單運費（HKD）；同一訂單多商品取最高值';
comment on column products.courier_fee is '每單配送員工資覆寫（HKD）；NULL 則使用商家預設';

notify pgrst, 'reload schema';
