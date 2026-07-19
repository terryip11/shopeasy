-- 商品綁定取件點（空 = 使用店鋪預設取件點）

alter table products
  add column if not exists pickup_location_id uuid
    references merchant_pickup_locations(id) on delete set null;

create index if not exists products_pickup_location_idx
  on products (pickup_location_id)
  where pickup_location_id is not null;

comment on column products.pickup_location_id is '此商品發貨取件點；null 表示使用商家預設取件點';
