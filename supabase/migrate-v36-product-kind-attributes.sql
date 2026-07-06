-- 商品行業欄位
alter table products
  add column if not exists product_kind text not null default 'general'
    check (product_kind in ('general', 'menu_item', 'apparel', 'footwear'));

alter table products
  add column if not exists attributes jsonb not null default '{}';

alter table products
  add column if not exists menu_category_id uuid references merchant_menu_categories(id) on delete set null;

create index if not exists products_menu_category_idx on products(menu_category_id);

comment on column products.product_kind is 'general=一般零售, menu_item=餐飲, apparel=服飾, footwear=鞋類';
comment on column products.attributes is '行業專用彈性欄位 JSON';
comment on column products.menu_category_id is '餐飲店內餐單分類';
