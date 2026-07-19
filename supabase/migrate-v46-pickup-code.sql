-- 配送取件確認碼（商家出示 QR，配送員掃描後才能標記已取件）

alter table delivery_jobs
  add column if not exists pickup_code text;

update delivery_jobs
set pickup_code = upper(substr(replace(id::text, '-', ''), 1, 8))
where pickup_code is null;

alter table delivery_jobs
  alter column pickup_code set not null;

create unique index if not exists delivery_jobs_pickup_code_uidx
  on delivery_jobs (pickup_code);

comment on column delivery_jobs.pickup_code is '取件確認碼；商家 QR 與配送員掃描核對用';
