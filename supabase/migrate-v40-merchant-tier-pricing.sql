-- 商家訂閱月費（super_admin 可於後台調整）

insert into platform_settings (key, value)
values
  ('merchant_tier_monthly_price_premium', '88'::jsonb),
  ('merchant_tier_monthly_price_vip', '128'::jsonb)
on conflict (key) do nothing;

comment on table platform_settings is '平台全局設定（JSON value）；含 courier 抽成、商家訂閱月費等';

notify pgrst, 'reload schema';
