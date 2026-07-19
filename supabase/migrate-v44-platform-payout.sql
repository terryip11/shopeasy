-- 平台收款資料（轉數快 FPS，供商家月結平台費等）

insert into platform_settings (key, value)
values
  ('platform_payout_account_holder', '""'::jsonb),
  ('platform_payout_fps_id', '""'::jsonb),
  ('platform_payout_instructions', '""'::jsonb)
on conflict (key) do nothing;
