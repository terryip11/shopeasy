-- v52: 公開首頁落地頁版面（admin 可選 harbor / market / route）
-- 相依：v26 platform_settings

insert into platform_settings (key, value)
values ('landing_page_variant', to_jsonb('harbor'::text))
on conflict (key) do nothing;
