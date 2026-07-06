-- 配送區域：大區 + 香港 18 區

alter table delivery_zones add column if not exists region text;

comment on column delivery_zones.region is '大區：港島、九龍、新界';

update delivery_zones set region = name where region is null;

insert into delivery_zones (name, slug, region) values
  ('中西區', 'central-western', '港島'),
  ('灣仔', 'wan-chai', '港島'),
  ('東區', 'eastern', '港島'),
  ('南區', 'southern', '港島'),
  ('油尖旺', 'yau-tsim-mong', '九龍'),
  ('深水埗', 'sham-shui-po', '九龍'),
  ('九龍城', 'kowloon-city-district', '九龍'),
  ('黃大仙', 'wong-tai-sin', '九龍'),
  ('觀塘', 'kwun-tong', '九龍'),
  ('葵青', 'kwai-tsing', '新界'),
  ('荃灣', 'tsuen-wan', '新界'),
  ('屯門', 'tuen-mun', '新界'),
  ('元朗', 'yuen-long', '新界'),
  ('北區', 'north-district', '新界'),
  ('大埔', 'tai-po', '新界'),
  ('沙田', 'sha-tin', '新界'),
  ('西貢', 'sai-kung', '新界'),
  ('離島', 'islands', '新界')
on conflict (slug) do update set
  name = excluded.name,
  region = excluded.region;
