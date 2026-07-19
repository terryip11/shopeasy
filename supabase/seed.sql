-- supabase/seed.sql
-- 示範資料（在 schema.sql 執行後運行；既有專案請改跑 migrate-v51）
-- 注意：不會建立 auth 用戶，僅插入分類；商品需商家帳號後由後台建立

insert into categories (name, slug, sort_order) values
  ('美食外賣', 'food', 10),
  ('飲品甜品', 'drinks-desserts', 20),
  ('超市日用品', 'grocery', 30),
  ('電子數碼', 'electronics', 40),
  ('服飾鞋包', 'fashion', 50),
  ('美妝個人護理', 'beauty', 60),
  ('居家生活', 'home', 70),
  ('母嬰親子', 'baby-kids', 80),
  ('寵物用品', 'pets', 90),
  ('運動戶外', 'sports', 100),
  ('健康保健', 'health', 110),
  ('鮮花禮品', 'gifts', 120),
  ('玩具興趣', 'hobbies', 130),
  ('其他', 'other', 999)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;
