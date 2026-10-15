-- TMB: API pública limitada, vendedores provisionados y códigos transaccionales.
create schema if not exists tmb_private;
revoke all on schema tmb_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;

create table public.tmb_sellers (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 200),
 active boolean not null default true
);
alter table public.tmb_sellers enable row level security;
revoke all on public.tmb_sellers from anon, authenticated;
grant select on public.tmb_sellers to authenticated;
grant all on public.tmb_sellers to service_role;
create policy seller_self on public.tmb_sellers for select to authenticated using (id = (select auth.uid()) and active);

create table public.tmb_fri_requests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 status text not null default 'Pendiente a revisar' check(status in ('Pendiente a revisar','En revisión','Cotizado','Confirmado a compra')),
 code text not null unique check(code ~ '^TMB-[0-9]{6,}$'),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text) <= 24000)
);
create index tmb_fri_created_idx on public.tmb_fri_requests(created_at desc,id desc);
alter table public.tmb_fri_requests enable row level security;
revoke all on public.tmb_fri_requests from anon, authenticated;
grant select on public.tmb_fri_requests to authenticated;
grant all on public.tmb_fri_requests to service_role;
create policy seller_read on public.tmb_fri_requests for select to authenticated using (exists(select 1 from public.tmb_sellers where id=(select auth.uid()) and active));

create table tmb_private.counters(name text primary key, value bigint not null check(value>=0));
insert into tmb_private.counters values('fri',0);
create table tmb_private.receipts(request_id uuid primary key references public.tmb_fri_requests(id) on delete cascade, token_hash text not null unique);
create table tmb_private.rate_limits(key text primary key, window_start timestamptz not null, hits integer not null);
alter table tmb_private.counters enable row level security;
alter table tmb_private.receipts enable row level security;
alter table tmb_private.rate_limits enable row level security;

create function public.tmb_consume_limit(p_key text,p_max integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into tmb_private.rate_limits as r values(p_key,now(),1)
 on conflict(key) do update set
 hits=case when r.window_start < now()-make_interval(secs=>p_seconds) then 1 else least(r.hits+1,p_max+1) end,
 window_start=case when r.window_start < now()-make_interval(secs=>p_seconds) then now() else r.window_start end
 returning hits into n;
 delete from tmb_private.rate_limits where window_start < now()-interval '2 days';
 return n <= p_max;
end $$;
revoke all on function public.tmb_consume_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.tmb_consume_limit(text,integer,integer) to service_role;

create function public.tmb_create_fri(p_data jsonb,p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare request_id uuid; old_data jsonb; n bigint; hashed text;
begin
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Token inválido'; end if;
 hashed=encode(extensions.digest(p_token,'sha256'),'hex');
 -- Serialize the same idempotency token before reserving a consecutive number.
 perform pg_advisory_xact_lock(hashtextextended(hashed,0));
 select r.id,r.data into request_id,old_data from public.tmb_fri_requests r join tmb_private.receipts t on t.request_id=r.id where t.token_hash=hashed;
 if request_id is not null then
   if old_data <> p_data then raise exception 'Token ya utilizado'; end if;
   return request_id;
 end if;
 if jsonb_typeof(p_data)<>'object' or p_data->'declaration' is distinct from 'true'::jsonb then raise exception 'Solicitud inválida'; end if;
 update tmb_private.counters set value=value+1 where name='fri' returning value into n;
 if n is null then raise exception 'Contador no configurado'; end if;
 insert into public.tmb_fri_requests(code,data) values('TMB-'||lpad(n::text,greatest(6,length(n::text)),'0'),p_data) returning id into request_id;
 insert into tmb_private.receipts values(request_id,hashed);
 return request_id;
end $$;
revoke all on function public.tmb_create_fri(jsonb,text) from public,anon,authenticated;
grant execute on function public.tmb_create_fri(jsonb,text) to service_role;

create function public.tmb_read_receipt(p_id uuid,p_token text) returns setof public.tmb_fri_requests
language sql stable security definer set search_path='' as $$
 select r.* from public.tmb_fri_requests r join tmb_private.receipts t on t.request_id=r.id
 where r.id=p_id and length(p_token)=64 and t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;
revoke all on function public.tmb_read_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.tmb_read_receipt(uuid,text) to service_role;

create function public.tmb_review_fri(p_id uuid) returns setof public.tmb_fri_requests
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.tmb_sellers where id=(select auth.uid()) and active) then
   raise exception 'Acceso denegado' using errcode='42501';
 end if;
 update public.tmb_fri_requests set status='En revisión' where id=p_id and status='Pendiente a revisar';
 return query select * from public.tmb_fri_requests where id=p_id;
end $$;
revoke all on function public.tmb_review_fri(uuid) from public,anon;
grant execute on function public.tmb_review_fri(uuid) to authenticated;
