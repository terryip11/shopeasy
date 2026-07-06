-- 配送員最低基本工資（平台保底，防止商家壓低報酬）

insert into platform_settings (key, value)
values
  ('courier_min_base_fee_food', '28'::jsonb),
  ('courier_min_base_fee_parcel', '35'::jsonb)
on conflict (key) do nothing;

comment on table platform_settings is '平台全局設定（JSON value）；courier_min_base_fee_food/parcel 為送餐／送貨最低基本工資（HKD）';

notify pgrst, 'reload schema';
