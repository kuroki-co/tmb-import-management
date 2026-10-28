-- Some scraped and supplier records stored the make as part of the model too,
-- causing the UI to render labels such as "Toyota Toyota Corolla".
update public.tmb_vehicle_catalog
set model = ltrim(substring(model from char_length(brand) + 1)),
    updated_at = now()
where lower(left(model, char_length(brand))) = lower(brand)
  and substring(model from char_length(brand) + 1 for 1)
    in (' ', '-', '–', '—', ':');
