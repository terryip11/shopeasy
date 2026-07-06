-- migrate-v11-merchant-logo.sql
-- 商家店鋪 Logo

alter table merchants add column if not exists logo_url text;

drop policy if exists "merchants_owner_update_profile" on merchants;
create policy "merchants_owner_update_profile" on merchants
  for update
  using (user_id = auth.uid() and status = 'active')
  with check (user_id = auth.uid() and status = 'active');
