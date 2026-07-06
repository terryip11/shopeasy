-- 商家業務類型：餐飲（外賣）或零售（網店送貨）

alter table merchants
  add column if not exists business_type text not null default 'retail'
    check (business_type in ('food', 'retail'));

comment on column merchants.business_type is '業務類型：food=餐飲外賣（預設送餐任務），retail=零售網店（預設送貨任務）';

notify pgrst, 'reload schema';
