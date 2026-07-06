-- 配送員申請：香港身份證 + 入駐聲明

alter table courier_profiles
  add column if not exists hkid_image_url text,
  add column if not exists declaration_accepted_at timestamptz;

comment on column courier_profiles.hkid_image_url is '香港身份證影像（審核用，僅管理員可讀）';
comment on column courier_profiles.declaration_accepted_at is '用戶接受入駐聲明之時間';
