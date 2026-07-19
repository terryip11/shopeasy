-- 商家預設發貨／取件地點（與公司營業地址分開，可於店鋪設置修改）

alter table merchants
  add column if not exists default_pickup_address text,
  add column if not exists default_pickup_contact_name text,
  add column if not exists default_pickup_contact_phone text;

update merchants
set
  default_pickup_address = coalesce(default_pickup_address, company_address),
  default_pickup_contact_name = coalesce(default_pickup_contact_name, contact_name),
  default_pickup_contact_phone = coalesce(default_pickup_contact_phone, contact_phone)
where
  default_pickup_address is null
  or default_pickup_contact_name is null
  or default_pickup_contact_phone is null;

alter table delivery_jobs
  add column if not exists pickup_contact_name text,
  add column if not exists pickup_contact_phone text;

comment on column merchants.default_pickup_address is '預設取件／發貨地址，建立配送時帶入';
comment on column merchants.default_pickup_contact_name is '取件聯絡人姓名';
comment on column merchants.default_pickup_contact_phone is '取件聯絡電話';
comment on column delivery_jobs.pickup_contact_name is '建單時快照的取件聯絡人';
comment on column delivery_jobs.pickup_contact_phone is '建單時快照的取件聯絡電話';
