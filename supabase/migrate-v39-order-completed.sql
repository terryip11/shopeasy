-- 訂單「已完成」狀態（配送送達後自動標記）
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in (
    'pending', 'paid', 'shipped', 'completed',
    'cancelled', 'refunded', 'refund_requested'
  ));

comment on column orders.status is 'completed=配送已送達且交易完成';
