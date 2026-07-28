-- 商家等級能力上限（商品數／每件圖片數；super_admin 可於後台調整）

insert into platform_settings (key, value)
values (
  'merchant_tier_limits',
  '{
    "basic": { "maxProducts": 3, "maxImagesPerProduct": 2 },
    "premium": { "maxProducts": 20, "maxImagesPerProduct": 5 },
    "vip": { "maxProducts": 50, "maxImagesPerProduct": 8 }
  }'::jsonb
)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
