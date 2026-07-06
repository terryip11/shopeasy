-- 零售商品規格（呎碼、顏色、分規格庫存）
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text,
  size text,
  color text,
  price numeric(10,2),
  stock int not null default 0 check (stock >= 0),
  sort_order int not null default 0,
  options jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on product_variants(product_id, sort_order);

alter table product_variants enable row level security;

drop policy if exists "product_variants_public_read" on product_variants;
drop policy if exists "product_variants_merchant_all" on product_variants;

create policy "product_variants_public_read" on product_variants
  for select using (
    product_id in (select id from products where status = 'published')
  );

create policy "product_variants_merchant_all" on product_variants
  for all using (
    product_id in (
      select p.id from products p
      join merchants m on m.id = p.merchant_id
      where m.user_id = auth.uid() and m.status = 'active'
    )
  );
