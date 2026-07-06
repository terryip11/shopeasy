-- 配送員配送費記帳 + 每月薪資結算（每月 5 號結算上月）

create table if not exists courier_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft'
    check (status in ('draft', 'settled')),
  total_amount numeric(12,2) not null default 0,
  courier_count integer not null default 0,
  earnings_count integer not null default 0,
  settled_at timestamptz,
  settled_by uuid references auth.users(id),
  notes text,
  created_at timestamptz default now(),
  unique (period_start)
);

create table if not exists courier_payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references courier_payroll_runs(id) on delete cascade,
  courier_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  earnings_count integer not null default 0,
  created_at timestamptz default now(),
  unique (payroll_run_id, courier_id)
);

create table if not exists courier_delivery_earnings (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references delivery_jobs(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  courier_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (job_type in ('food', 'parcel')),
  amount numeric(10,2) not null,
  settlement_status text not null default 'pending'
    check (settlement_status in ('pending', 'settled', 'reversed')),
  payroll_run_id uuid references courier_payroll_runs(id),
  earned_at timestamptz not null default now(),
  created_at timestamptz default now(),
  unique (delivery_job_id)
);

create index if not exists courier_delivery_earnings_courier_idx
  on courier_delivery_earnings (courier_id, earned_at desc);
create index if not exists courier_delivery_earnings_pending_idx
  on courier_delivery_earnings (settlement_status, earned_at)
  where settlement_status = 'pending';

comment on table courier_delivery_earnings is '配送完成後記錄配送員應得工資（待每月結算）';
comment on table courier_payroll_runs is '每月配送員薪資結算批次（建議每月 5 號結算上月）';

alter table courier_delivery_earnings enable row level security;
alter table courier_payroll_runs enable row level security;
alter table courier_payroll_lines enable row level security;

drop policy if exists "courier_earnings_read_own" on courier_delivery_earnings;
create policy "courier_earnings_read_own" on courier_delivery_earnings
  for select using (courier_id = auth.uid() or public.is_finance_staff());

drop policy if exists "courier_payroll_finance_staff" on courier_payroll_runs;
create policy "courier_payroll_finance_staff" on courier_payroll_runs
  for all using (public.is_finance_staff())
  with check (public.is_finance_staff());

drop policy if exists "courier_payroll_lines_finance_staff" on courier_payroll_lines;
create policy "courier_payroll_lines_finance_staff" on courier_payroll_lines
  for all using (public.is_finance_staff())
  with check (public.is_finance_staff());

-- 若尚未執行 migrate-v19，建立 is_finance_staff 備用
create or replace function public.is_finance_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin', 'accountant')
  );
$$;

notify pgrst, 'reload schema';
