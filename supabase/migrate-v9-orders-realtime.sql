-- migrate-v9-orders-realtime.sql
-- 啟用訂單表 Realtime，供商家即時收到新訂單通知

alter table orders replica identity full;

do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when duplicate_object then null;
end $$;
