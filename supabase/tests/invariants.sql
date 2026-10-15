begin;
do $$
declare a uuid; b uuid; before_value bigint; after_value bigint;
begin
 select value into before_value from tmb_private.counters where name='fri';
 a=public.tmb_create_fri('{"declaration":true}'::jsonb,repeat('a',64));
 b=public.tmb_create_fri('{"declaration":true}'::jsonb,repeat('a',64));
 if a<>b then raise exception 'Idempotency failed'; end if;
 select value into after_value from tmb_private.counters where name='fri';
 if after_value<>before_value+1 then raise exception 'Counter duplicated'; end if;
 if (select count(*) from public.tmb_read_receipt(a,repeat('b',64)))<>0 then raise exception 'Receipt leak'; end if;
 if (select count(*) from public.tmb_read_receipt(a,repeat('a',64)))<>1 then raise exception 'Receipt missing'; end if;
 begin
  perform public.tmb_create_fri('{"declaration":false}'::jsonb,repeat('c',64));
  raise exception 'Validation should fail';
 exception when others then
  if SQLERRM='Validation should fail' then raise; end if;
 end;
 if (select value from tmb_private.counters where name='fri')<>after_value then raise exception 'Failed operation consumed code'; end if;
 if has_function_privilege('anon','public.tmb_create_fri(jsonb,text)','execute') then raise exception 'Anonymous RPC write';end if;
 if has_function_privilege('authenticated','public.tmb_create_fri(jsonb,text)','execute') then raise exception 'User RPC write';end if;
 if has_function_privilege('anon','public.tmb_read_receipt(uuid,text)','execute') then raise exception 'Anonymous receipt RPC';end if;
 if has_table_privilege('anon','public.tmb_fri_requests','select') then raise exception 'Anonymous read';end if;
 if has_table_privilege('authenticated','public.tmb_fri_requests','update') then raise exception 'Manual status write';end if;
 if not public.tmb_consume_limit('test:limit',1,60) then raise exception 'First limit denied';end if;
 if public.tmb_consume_limit('test:limit',1,60) then raise exception 'Rate limit bypass';end if;
end $$;
rollback;
