-- v53: 平台收費模式（訂閱為主／商家直付分享員與配送員）
-- 相依：v26 platform_settings
-- 預設：subscription_only + merchant_direct（不抽商家訂單利潤）

insert into platform_settings (key, value)
values
  ('platform_monetization_mode', to_jsonb('subscription_only'::text)),
  ('platform_payout_model', to_jsonb('merchant_direct'::text))
on conflict (key) do nothing;
