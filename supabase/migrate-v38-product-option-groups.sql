-- 餐飲商品選項（加料、辣度等）
create table if not exists product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 1 check (max_select >= 1),
  required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_option_groups_product_idx on product_option_groups(product_id, sort_order);
create index if not exists product_options_group_idx on product_options(group_id, sort_order);

alter table product_option_groups enable row level security;
alter table product_options enable row level security;

drop policy if exists "product_option_groups_public_read" on product_option_groups;
drop policy if exists "product_option_groups_merchant_all" on product_option_groups;
drop policy if exists "product_options_public_read" on product_options;
drop policy if exists "product_options_merchant_all" on product_options;

create policy "product_option_groups_public_read" on product_option_groups
  for select using (
    product_id in (select id from products where status = 'published')
  );

create policy "product_option_groups_merchant_all" on product_option_groups
  for all using (
    product_id in (
      select p.id from products p
      join merchants m on m.id = p.merchant_id
      where m.user_id = auth.uid() and m.status = 'active'
    )
  );

create policy "product_options_public_read" on product_options
  for select using (
    group_id in (
      select g.id from product_option_groups g
      join products p on p.id = g.product_id
      where p.status = 'published'
    )
  );

create policy "product_options_merchant_all" on product_options
  for all using (
    group_id in (
      select g.id from product_option_groups g
      join products p on p.id = g.product_id
      join merchants m on m.id = p.merchant_id
      where m.user_id = auth.uid() and m.status = 'active'
    )
  );
