-- 會計員角色（財務後台）

-- 擴充 profiles.role
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('buyer', 'merchant', 'admin', 'super_admin', 'accountant'));

-- 財務人員（super_admin + accountant）
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

-- order_ledger：會計員可讀
drop policy if exists "order_ledger_finance_staff_read" on order_ledger;
create policy "order_ledger_finance_staff_read" on order_ledger
  for select using (public.is_finance_staff());

-- platform_monthly_costs：會計員可讀寫
drop policy if exists "platform_monthly_costs_super_admin_all" on platform_monthly_costs;
drop policy if exists "platform_monthly_costs_finance_staff_all" on platform_monthly_costs;
create policy "platform_monthly_costs_finance_staff_all" on platform_monthly_costs
  for all using (public.is_finance_staff())
  with check (public.is_finance_staff());

-- 訂閱收入：會計員可讀
drop policy if exists "subscription_payments_finance_staff_read" on merchant_subscription_payments;
create policy "subscription_payments_finance_staff_read" on merchant_subscription_payments
  for select using (public.is_finance_staff());

notify pgrst, 'reload schema';
