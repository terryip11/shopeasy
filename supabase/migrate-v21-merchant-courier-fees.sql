-- 商家自訂配送員每單工資（送餐 / 送貨）

alter table merchants
  add column if not exists courier_fee_food numeric(10,2) not null default 25,
  add column if not exists courier_fee_parcel numeric(10,2) not null default 35;

comment on column merchants.courier_fee_food is '每單送餐配送員工資（HKD），由商家設定';
comment on column merchants.courier_fee_parcel is '每單送貨配送員工資（HKD），由商家設定';

notify pgrst, 'reload schema';
