-- supabase/migrate-v3-hk-merchant.sql
-- 香港公司入駐欄位（在 migrate-v2 之後執行）

alter table merchants add column if not exists contact_name text;
alter table merchants add column if not exists contact_phone text;
alter table merchants add column if not exists contact_email text;
alter table merchants add column if not exists company_address text;
alter table merchants add column if not exists br_image_url text;
alter table merchants add column if not exists ci_image_url text;
alter table merchants add column if not exists data_consent_at timestamptz;
