-- v56: 強制鎖定訂閱為主 + 商家直付（取消舊抽成／代結算選項）
-- 相依：v53 monetization-mode

insert into platform_settings (key, value, updated_at)
values
  ('platform_monetization_mode', to_jsonb('subscription_only'::text), now()),
  ('platform_payout_model', to_jsonb('merchant_direct'::text), now())
on conflict (key) do update
set
  value = excluded.value,
  updated_at = now();

notify pgrst, 'reload schema';
