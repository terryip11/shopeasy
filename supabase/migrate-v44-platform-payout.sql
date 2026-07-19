-- v44: 平台 FPS 收款資料（供商家預付／儲值平台服務費時轉帳）
-- 相依：需已執行 v26（建立 platform_settings）
-- 可重複執行；僅插入缺漏的 key，不覆寫已填內容

insert into platform_settings (key, value)
values
  ('platform_payout_account_holder', to_jsonb(''::text)),
  ('platform_payout_fps_id', to_jsonb(''::text)),
  ('platform_payout_instructions', to_jsonb(''::text))
on conflict (key) do nothing;
