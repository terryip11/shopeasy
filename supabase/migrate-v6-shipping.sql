-- migrate-v6-shipping.sql
-- 訂單收貨地址（結帳時收集，配送任務自動帶入）

alter table orders add column if not exists shipping_name text;
alter table orders add column if not exists shipping_phone text;
alter table orders add column if not exists shipping_address text;
alter table orders add column if not exists shipping_zone_id uuid references delivery_zones(id);

create index if not exists orders_shipping_zone_idx on orders(shipping_zone_id);
