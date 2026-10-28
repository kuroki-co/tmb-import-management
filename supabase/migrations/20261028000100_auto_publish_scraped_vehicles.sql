-- Publish valid web-catalog records automatically. Existing published status is
-- preserved on conflict so a seller can still intentionally hide a vehicle.
update public.tmb_vehicle_catalog
set is_published = true,
    published_at = coalesce(published_at, now()),
    updated_at = now()
where source_type = 'tmb_web'
  and is_active = true
  and is_published = false;

create or replace function public.tmb_auto_publish_scraped_vehicle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_type = 'tmb_web' then
    new.is_published := true;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

revoke all on function public.tmb_auto_publish_scraped_vehicle() from public, anon, authenticated;

create trigger tmb_auto_publish_scraped_vehicle_before_insert
before insert on public.tmb_vehicle_catalog
for each row execute function public.tmb_auto_publish_scraped_vehicle();
