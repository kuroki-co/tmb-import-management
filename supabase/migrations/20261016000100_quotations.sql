-- TMB: parámetros base y cotizaciones de importación.
-- Los cambios particulares de una cotización se guardan en su propio registro;
-- nunca actualizan los valores base de configuración.
create table public.tmb_quotation_settings (
  id integer primary key default 1 check (id = 1),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.tmb_quotation_settings enable row level security;
revoke all on public.tmb_quotation_settings from anon, authenticated;
grant all on public.tmb_quotation_settings to service_role;

insert into public.tmb_quotation_settings (id, config)
values (
  1,
  '{
    "exchangeRate": 3.335,
    "insuranceRate": 0.015,
    "advRate": 0,
    "ipmRate": 0.02,
    "importIgvRate": 0.16,
    "dispatchTaxUsd": 0,
    "perceptionRate": 0.035,
    "localCosts": {
      "transportUsd": 0,
      "insuranceUsd": 0,
      "freightUsd": 0,
      "fobExpensesUsd": 0,
      "handlingUsd": 300,
      "customsUsd": 300,
      "gateInUsd": 280,
      "storageUsd": 800,
      "approvalUsd": 320,
      "minimumCommissionUsd": 300
    },
    "localIgvRate": 0.18
  }'::jsonb
)
on conflict (id) do nothing;

create table public.tmb_quotations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.tmb_fri_requests(id) on delete restrict,
  seller_id uuid not null references public.tmb_sellers(id) on delete restrict,
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  settings_snapshot jsonb not null check (jsonb_typeof(settings_snapshot) = 'object'),
  calculation jsonb not null check (jsonb_typeof(calculation) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tmb_quotations_updated_idx on public.tmb_quotations(updated_at desc, id desc);
alter table public.tmb_quotations enable row level security;
revoke all on public.tmb_quotations from anon, authenticated;
grant all on public.tmb_quotations to service_role;
