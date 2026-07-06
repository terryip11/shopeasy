-- 高評配送員加價：評分達門檻才加價（取代舊版低評加價預設規則）

delete from courier_buyer_rating_surcharges
where rating_below in (2.0, 3.0, 4.0)
  and label like '%低於%';

insert into courier_buyer_rating_surcharges (rating_below, surcharge_hkd, label, sort_order)
values
  (4.0, 5, '配送員評分達 4.0', 1),
  (4.5, 10, '配送員評分達 4.5', 2),
  (4.8, 15, '配送員評分達 4.8', 3)
on conflict (rating_below) do update set
  surcharge_hkd = excluded.surcharge_hkd,
  label = excluded.label,
  sort_order = excluded.sort_order;

comment on column courier_buyer_rating_surcharges.rating_below is '配送員歷史平均評分須達此門檻（含）才適用加價';

notify pgrst, 'reload schema';
