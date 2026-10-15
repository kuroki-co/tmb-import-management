-- Keep test mutations in one transaction; never consume real sequence values.
begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000011','tmb-sql-test@example.invalid');
insert into public.tmb_sellers values('00000000-0000-4000-8000-000000000011','Test seller',true);
insert into public.tmb_fri_requests(id,code,data) values('00000000-0000-4000-8000-000000000012','TMB-00000000','{"declaration":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.tmb_fri_requests where id='00000000-0000-4000-8000-000000000012')<>1 then raise exception 'Seller cannot read';end if;
 perform public.tmb_review_fri('00000000-0000-4000-8000-000000000012');
 if (select status from public.tmb_fri_requests where id='00000000-0000-4000-8000-000000000012')<>'En revisión' then raise exception 'Review failed';end if;
end $$;
reset role;
update public.tmb_fri_requests set status='Cotizado' where id='00000000-0000-4000-8000-000000000012';
set local role authenticated;
do $$ begin
 perform public.tmb_review_fri('00000000-0000-4000-8000-000000000012');
 if (select status from public.tmb_fri_requests where id='00000000-0000-4000-8000-000000000012')<>'Cotizado' then raise exception 'State regression';end if;
end $$;
reset role;
update public.tmb_sellers set active=false where id='00000000-0000-4000-8000-000000000011';
set local role authenticated;
do $$ begin
 if (select count(*) from public.tmb_fri_requests)>0 then raise exception 'Inactive seller read';end if;
 begin
  perform public.tmb_review_fri('00000000-0000-4000-8000-000000000012');
  raise exception 'Inactive seller write';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.tmb_fri_requests)>0 then raise exception 'User without role read';end if;
end $$;
rollback;
