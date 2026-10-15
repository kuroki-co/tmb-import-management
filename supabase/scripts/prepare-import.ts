// Run from repository root after backend/scripts/export-supabase.mjs.
// Produces a reviewable transaction; does not connect to or mutate a database.
import { inputSchema } from "../functions/_shared/validation.ts";
const source = JSON.parse(
  await Deno.readTextFile("tmp/migration/nest-export.json"),
);
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const statements = [
  "begin;",
  "set local standard_conforming_strings=on;",
  "lock table public.tmb_fri_requests in exclusive mode;",
  "create function pg_temp.tmb_assert(p_ok boolean) returns void language plpgsql as $$ begin if p_ok is distinct from true then raise exception 'Conflicting migrated record or receipt'; end if; end $$;",
];
for (const r of source.requests) {
  if (
    !/^[0-9a-f-]{36}$/.test(r.id) || !/^TMB-[0-9]{6,}$/.test(r.code) ||
    !/^[a-f0-9]{64}$/.test(r.receipt_hash)
  ) throw new Error("Invalid source identity");
  inputSchema.parse(r.data);
  const json = quote(JSON.stringify(r.data)) + "::jsonb";
  const id = quote(r.id) + "::uuid";
  const date = quote(r.created_at) + "::timestamptz";
  statements.push(`select pg_temp.tmb_assert(not exists(select 1 from public.tmb_fri_requests where id=${id} and (data<>${json} or code<>${
    quote(r.code)
  } or status<>${
    quote(r.status)
  } or created_at<>${date})));`);
  statements.push(
    `insert into public.tmb_fri_requests(id,created_at,status,code,data) values(${id},${date},${
      quote(r.status)
    },${quote(r.code)},${json}) on conflict(id) do nothing;`,
  );
  statements.push(
    `insert into tmb_private.receipts(request_id,token_hash) values(${id},${
      quote(r.receipt_hash)
    }) on conflict(request_id) do nothing;`,
  );
  statements.push(
    `select pg_temp.tmb_assert(exists(select 1 from tmb_private.receipts where request_id=${id} and token_hash=${
      quote(r.receipt_hash)
    }));`,
  );
}
if (!/^\d+$/.test(String(source.lastValue))) throw new Error("Invalid counter");
statements.push(
  `update tmb_private.counters set value=greatest(value,${source.lastValue}::bigint,coalesce((select max(substring(code from 5)::bigint) from public.tmb_fri_requests),0)) where name='fri';`,
);
statements.push("commit;");
await Deno.writeTextFile(
  "tmp/migration/import-supabase.sql",
  statements.join("\n"),
);
console.log(
  `Preparada importación de ${source.requests.length} solicitudes. La transacción conserva UUID, códigos, fechas, estados y recibos.`,
);
