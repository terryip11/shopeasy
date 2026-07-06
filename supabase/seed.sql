-- supabase/seed.sql
-- 示範資料（在 schema.sql 執行後運行）
-- 注意：不會建立 auth 用戶，僅插入分類；商品需商家帳號後由後台建立

insert into categories (name, slug) values
  ('電子產品', 'electronics'),
  ('服飾配件', 'fashion'),
  ('居家生活', 'home'),
  ('運動戶外', 'sports')
on conflict (slug) do nothing;
