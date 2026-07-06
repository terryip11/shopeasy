-- 商家店內餐單分類（餐飲）
create table if not exists merchant_menu_categories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists merchant_menu_categories_merchant_idx
  on merchant_menu_categories(merchant_id, sort_order);

alter table merchant_menu_categories enable row level security;

drop policy if exists "menu_categories_public_read" on merchant_menu_categories;
drop policy if exists "menu_categories_merchant_all" on merchant_menu_categories;

create policy "menu_categories_public_read" on merchant_menu_categories
  for select using (true);

create policy "menu_categories_merchant_all" on merchant_menu_categories
  for all using (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
  );
