-- Citas reservadas desde la confirmación del FRI y conexión privada de Calendar.
create table public.tmb_appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.tmb_fri_requests(id) on delete restrict,
  request_code text not null,
  starts_at timestamptz not null unique,
  ends_at timestamptz not null,
  client_name text not null,
  vehicle text not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed')),
  google_event_id text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index tmb_appointments_starts_idx on public.tmb_appointments(starts_at);
alter table public.tmb_appointments enable row level security;
revoke all on public.tmb_appointments from public, anon, authenticated;
grant all on public.tmb_appointments to service_role;

create table public.tmb_calendar_connections (
  id integer primary key default 1 check (id = 1),
  google_email text not null,
  encrypted_refresh_token text not null,
  connected_at timestamptz not null default now(),
  connected_by uuid references auth.users(id) on delete set null
);
alter table public.tmb_calendar_connections enable row level security;
revoke all on public.tmb_calendar_connections from public, anon, authenticated;
grant all on public.tmb_calendar_connections to service_role;

create table public.tmb_calendar_oauth_states (
  state_hash text primary key,
  seller_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.tmb_calendar_oauth_states enable row level security;
revoke all on public.tmb_calendar_oauth_states from public, anon, authenticated;
grant all on public.tmb_calendar_oauth_states to service_role;
