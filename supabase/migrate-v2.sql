-- supabase/migrate-v2.sql
-- 既有資料庫升級腳本（在 Supabase SQL Editor 執行）

alter table products add column if not exists stock integer not null default 0;
alter table products drop constraint if exists products_stock_check;
alter table products add constraint products_stock_check check (stock >= 0);

alter table orders add column if not exists tracking_number text;

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'cancelled', 'refunded', 'refund_requested'));

drop policy if exists "orders_buyer_update_refund" on orders;
create policy "orders_buyer_update_refund" on orders
  for update
  using (user_id = auth.uid() and status in ('paid', 'shipped'))
  with check (user_id = auth.uid() and status = 'refund_requested');
