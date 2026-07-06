-- migrate-v10-delivery-tracking.sql
-- 配送座標與即時追蹤

alter table delivery_jobs add column if not exists dropoff_lat numeric(10, 7);
alter table delivery_jobs add column if not exists dropoff_lng numeric(10, 7);
alter table delivery_jobs add column if not exists pickup_lat numeric(10, 7);
alter table delivery_jobs add column if not exists pickup_lng numeric(10, 7);
alter table delivery_jobs add column if not exists courier_lat numeric(10, 7);
alter table delivery_jobs add column if not exists courier_lng numeric(10, 7);
alter table delivery_jobs add column if not exists courier_location_at timestamptz;

do $$
begin
  alter publication supabase_realtime add table delivery_jobs;
exception
  when duplicate_object then null;
end $$;
