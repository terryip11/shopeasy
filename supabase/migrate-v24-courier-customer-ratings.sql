-- 修正評分方向：客戶送達後評配送員（若曾執行錯誤版 v23 請執行本檔）

-- 移除錯誤的「配送員評客戶」結構
drop trigger if exists buyer_ratings_refresh on buyer_ratings;
drop table if exists buyer_ratings cascade;

alter table profiles drop column if exists buyer_rating_avg;
alter table profiles drop column if exists buyer_rating_count;

-- 配送員客戶評分（客戶對配送員）
alter table courier_profiles
  add column if not exists customer_rating_avg numeric(3,2),
  add column if not exists customer_rating_count integer not null default 0;

comment on column courier_profiles.customer_rating_avg is '客戶對配送員的歷史平均評分';
comment on column courier_profiles.customer_rating_count is '客戶對配送員的評分筆數';

create table if not exists courier_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  courier_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 5),
  created_at timestamptz default now(),
  unique (order_id)
);

comment on table courier_ratings is '客戶送達後對配送員的評分';

create index if not exists courier_ratings_courier_id_idx on courier_ratings (courier_id);

create or replace function public.refresh_courier_customer_rating_stats(p_courier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3,2);
  v_count integer;
begin
  select round(avg(score)::numeric, 2), count(*)::integer
  into v_avg, v_count
  from courier_ratings
  where courier_id = p_courier_id;

  update courier_profiles
  set customer_rating_avg = v_avg,
      customer_rating_count = coalesce(v_count, 0)
  where user_id = p_courier_id;
end;
$$;

create or replace function public.trg_courier_ratings_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_courier_customer_rating_stats(coalesce(new.courier_id, old.courier_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists courier_ratings_refresh on courier_ratings;
create trigger courier_ratings_refresh
  after insert or update or delete on courier_ratings
  for each row execute function public.trg_courier_ratings_refresh();

alter table courier_ratings enable row level security;

drop policy if exists "courier_ratings_buyer_insert" on courier_ratings;
create policy "courier_ratings_buyer_insert" on courier_ratings
  for insert with check (buyer_id = auth.uid());

drop policy if exists "courier_ratings_read" on courier_ratings;
create policy "courier_ratings_read" on courier_ratings
  for select using (
    buyer_id = auth.uid()
    or courier_id = auth.uid()
    or public.is_platform_admin()
  );

-- 更新加價規則為高評達標加價
delete from courier_buyer_rating_surcharges where rating_below in (2.0, 3.0);

insert into courier_buyer_rating_surcharges (rating_below, surcharge_hkd, label, sort_order)
values
  (4.0, 5, '配送員評分達 4.0', 1),
  (4.5, 10, '配送員評分達 4.5', 2),
  (4.8, 15, '配送員評分達 4.8', 3)
on conflict (rating_below) do update set
  surcharge_hkd = excluded.surcharge_hkd,
  label = excluded.label;

notify pgrst, 'reload schema';
