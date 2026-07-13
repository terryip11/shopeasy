-- 店鋪公開頁品牌欄位（簡介、橫幅、主題色）

alter table merchants
  add column if not exists store_tagline text,
  add column if not exists store_description text,
  add column if not exists banner_url text,
  add column if not exists theme_color text;

comment on column merchants.store_tagline is '店鋪一句話標語（公開店鋪頁顯示）';
comment on column merchants.store_description is '店鋪簡介（公開店鋪頁顯示）';
comment on column merchants.banner_url is '店鋪橫幅圖 URL';
comment on column merchants.theme_color is '店鋪主題色（#RRGGBB）';

notify pgrst, 'reload schema';
