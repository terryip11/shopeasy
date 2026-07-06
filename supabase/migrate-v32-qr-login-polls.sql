-- 掃碼登入：電腦顯示 QR，手機確認後同步登入電腦端
create table if not exists public.qr_login_polls (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'consumed', 'expired')),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists qr_login_polls_status_expires_idx
  on public.qr_login_polls (status, expires_at);

alter table public.qr_login_polls enable row level security;
