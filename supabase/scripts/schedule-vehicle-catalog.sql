-- Run once in the Supabase SQL editor after enabling pg_cron and pg_net.
-- Replace the three placeholder values. Use the same random sync token for the
-- Edge Function secret VEHICLE_CATALOG_SYNC_SECRET and the Vault secret below.
select vault.create_secret('https://<project-ref>.supabase.co', 'vehicle_catalog_project_url');
select vault.create_secret('<publishable-or-anon-key>', 'vehicle_catalog_api_key');
select vault.create_secret('<same-long-random-sync-token-as-edge-secret>', 'vehicle_catalog_sync_secret');

select cron.schedule(
  'tmb-sync-vehicle-catalog',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'vehicle_catalog_project_url') || '/functions/v1/fri-api',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'vehicle_catalog_api_key'),
        'x-catalog-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'vehicle_catalog_sync_secret')
      ),
      body := '{"action":"catalog-sync"}'::jsonb
    );
  $job$
);
