-- 商家平台服務費預付餘額（線下收款：FPS／銀行／微信／支付寶）

alter table merchants
  add column if not exists platform_credit_balance numeric(12, 2) not null default 0;

alter table merchants
  add constraint merchants_platform_credit_balance_nonneg
  check (platform_credit_balance >= 0);

comment on column merchants.platform_credit_balance is '平台服務費預付餘額（HKD）；線下訂單確認收款時扣減';

create table if not exists merchant_platform_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  entry_type text not null
    check (entry_type in ('topup', 'deduct_order', 'refund_order', 'adjust')),
  amount numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  order_id uuid references orders(id) on delete set null,
  topup_request_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists merchant_platform_credit_ledger_merchant_idx
  on merchant_platform_credit_ledger (merchant_id, created_at desc);

create unique index if not exists merchant_platform_credit_ledger_order_deduct_uidx
  on merchant_platform_credit_ledger (order_id)
  where entry_type = 'deduct_order' and order_id is not null;

create unique index if not exists merchant_platform_credit_ledger_order_refund_uidx
  on merchant_platform_credit_ledger (order_id)
  where entry_type = 'refund_order' and order_id is not null;

create table if not exists merchant_credit_topup_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  merchant_note text,
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists merchant_credit_topup_requests_status_idx
  on merchant_credit_topup_requests (status, created_at desc);

create index if not exists merchant_credit_topup_requests_merchant_idx
  on merchant_credit_topup_requests (merchant_id, created_at desc);

alter table merchant_platform_credit_ledger
  drop constraint if exists merchant_platform_credit_ledger_topup_fk;

alter table merchant_platform_credit_ledger
  add constraint merchant_platform_credit_ledger_topup_fk
  foreign key (topup_request_id) references merchant_credit_topup_requests(id) on delete set null;

alter table merchant_platform_credit_ledger enable row level security;
alter table merchant_credit_topup_requests enable row level security;

drop policy if exists "platform_credit_ledger_merchant_select" on merchant_platform_credit_ledger;
drop policy if exists "platform_credit_topup_merchant_select" on merchant_credit_topup_requests;
drop policy if exists "platform_credit_topup_merchant_insert" on merchant_credit_topup_requests;

create policy "platform_credit_ledger_merchant_select" on merchant_platform_credit_ledger
  for select using (
    merchant_id in (select id from merchants where user_id = auth.uid())
  );

create policy "platform_credit_topup_merchant_select" on merchant_credit_topup_requests
  for select using (
    merchant_id in (select id from merchants where user_id = auth.uid())
  );

create policy "platform_credit_topup_merchant_insert" on merchant_credit_topup_requests
  for insert with check (
    merchant_id in (
      select id from merchants where user_id = auth.uid() and status = 'active'
    )
    and status = 'pending'
  );

-- 原子扣款：餘額足夠才扣，回傳扣後餘額；不足回傳 null
create or replace function deduct_merchant_platform_credit(
  p_merchant_id uuid,
  p_amount numeric,
  p_order_id uuid,
  p_note text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12, 2);
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  if exists (
    select 1 from merchant_platform_credit_ledger
    where order_id = p_order_id and entry_type = 'deduct_order'
  ) then
    select platform_credit_balance into v_balance
    from merchants where id = p_merchant_id;
    return v_balance;
  end if;

  update merchants
  set platform_credit_balance = platform_credit_balance - p_amount
  where id = p_merchant_id
    and platform_credit_balance >= p_amount
  returning platform_credit_balance into v_balance;

  if v_balance is null then
    return null;
  end if;

  insert into merchant_platform_credit_ledger (
    merchant_id, entry_type, amount, balance_after, order_id, note
  ) values (
    p_merchant_id, 'deduct_order', -p_amount, v_balance, p_order_id, p_note
  );

  return v_balance;
end;
$$;

create or replace function credit_merchant_platform_balance(
  p_merchant_id uuid,
  p_amount numeric,
  p_entry_type text,
  p_note text default null,
  p_order_id uuid default null,
  p_topup_request_id uuid default null,
  p_created_by uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12, 2);
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'amount required';
  end if;

  if p_entry_type = 'refund_order' and p_order_id is not null then
    if exists (
      select 1 from merchant_platform_credit_ledger
      where order_id = p_order_id and entry_type = 'refund_order'
    ) then
      select platform_credit_balance into v_balance
      from merchants where id = p_merchant_id;
      return v_balance;
    end if;
  end if;

  update merchants
  set platform_credit_balance = platform_credit_balance + p_amount
  where id = p_merchant_id
  returning platform_credit_balance into v_balance;

  if v_balance is null then
    raise exception 'merchant not found';
  end if;

  insert into merchant_platform_credit_ledger (
    merchant_id, entry_type, amount, balance_after, order_id, topup_request_id, note, created_by
  ) values (
    p_merchant_id, p_entry_type, p_amount, v_balance, p_order_id, p_topup_request_id, p_note, p_created_by
  );

  return v_balance;
end;
$$;
