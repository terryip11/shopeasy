-- 修復平台抽成快照：區分「接單時鎖定」與「migration 舊資料」

alter table delivery_jobs
  add column if not exists payout_snapshot_version smallint;

comment on column delivery_jobs.payout_snapshot_version is '1 = 接單時已鎖定平台抽成快照';

-- 清除 v26 對舊任務的誤導性回填（未經接單快照者）
update delivery_jobs
set
  courier_payout_net = null,
  platform_fee_rate = null,
  platform_fee_amount = 0
where payout_snapshot_version is null
  and courier_fee_total is not null
  and coalesce(courier_payout_net, courier_fee_total) = courier_fee_total
  and coalesce(platform_fee_amount, 0) = 0;

-- 待結算收入：依目前平台比例重算實收（僅尚未扣過服務費的紀錄）
do $$
declare
  r record;
  fee_rate numeric;
  pf numeric;
  net numeric;
  g numeric;
begin
  select (value #>> '{}')::numeric into fee_rate
  from platform_settings
  where key = 'courier_platform_fee_rate';

  fee_rate := coalesce(fee_rate, 0.10);
  fee_rate := greatest(0, least(1, fee_rate));

  for r in
    select id, amount, gross_amount
    from courier_delivery_earnings
    where settlement_status = 'pending'
      and coalesce(platform_fee_amount, 0) = 0
  loop
    g := coalesce(r.gross_amount, r.amount);
    pf := round(g * fee_rate, 2);
    net := round(g - pf, 2);

    update courier_delivery_earnings
    set
      gross_amount = g,
      platform_fee_rate = fee_rate,
      platform_fee_amount = pf,
      amount = net
    where id = r.id;
  end loop;
end $$;

notify pgrst, 'reload schema';
