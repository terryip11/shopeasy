-- 買家地址簿：配送區域改為選填（由商家建配送時指定）

alter table buyer_addresses
  alter column zone_id drop not null;

comment on column buyer_addresses.zone_id is '選填；買家可不填，配送區域由商家建立配送任務時指定';
