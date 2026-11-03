-- Cotizaciones creadas desde el FRI sin intervención de una vendedora.
-- Las cotizaciones manuales existentes conservan seller_id y el origen seller.
alter table public.tmb_quotations
  alter column seller_id drop not null;

alter table public.tmb_quotations
  add column origin text not null default 'seller'
    check (origin in ('automatic', 'seller')),
  add column automatic_email_status text
    check (automatic_email_status in ('sending', 'sent', 'failed', 'not_provided', 'not_configured'));

comment on column public.tmb_quotations.origin is
  'Indica si la proforma se calculó al recibir el FRI o fue preparada por una vendedora.';
comment on column public.tmb_quotations.automatic_email_status is
  'Resultado del correo automático con la proforma y el FRI; null para cotizaciones manuales.';
