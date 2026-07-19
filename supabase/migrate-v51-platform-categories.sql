-- v51: 平台商品分類預設清單（本地配送：餐飲 + 零售）
-- 可重複執行：依 slug upsert 名稱與排序

alter table categories
  add column if not exists sort_order integer not null default 100;

comment on column categories.sort_order is '買家瀏覽／後台列表排序（越小越前）';

-- 改名既有分類（保留 slug，避免已綁定商品失效）
update categories set name = '電子數碼', sort_order = 40 where slug = 'electronics';
update categories set name = '服飾鞋包', sort_order = 50 where slug = 'fashion';
update categories set name = '居家生活', sort_order = 70 where slug = 'home';
update categories set name = '運動戶外', sort_order = 100 where slug = 'sports';

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
