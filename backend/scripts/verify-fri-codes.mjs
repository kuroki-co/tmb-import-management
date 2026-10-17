import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Sequelize, QueryTypes } from 'sequelize';
import { FriService } from '../dist/modules/fri/fri.service.js';
import { PdfService } from '../dist/modules/fri/pdf.service.js';
import { mkdir, writeFile } from 'node:fs/promises';
const schema = `tmb_code_test_${randomUUID().replaceAll('-', '')}`;
assert.match(schema, /^tmb_code_test_[a-f0-9]{32}$/);
const admin = new Sequelize(process.env.DATABASE_URL, { logging: false });
const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { options: `-c search_path=${schema}` },
});
const fixture = {
  documentType: 'DNI',
  documentNumber: '01234567',
  name: 'Prueba de numeración',
  department: 'Arequipa',
  mobile: '999123456',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2026,
  quantity: 1,
  fuel: 'Gasolina',
  transmission: 'Automática',
  budget: 25000,
  purchaseDate: '2026-12-01',
  payment: 'Contado',
  alternatives: false,
  usage: 'Personal',
  declaration: true,
};
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(
    `CREATE TABLE "${schema}".fri_requests (LIKE public.fri_requests INCLUDING ALL)`,
  );
  await admin.query(
    `CREATE TABLE "${schema}".document_counters (LIKE public.document_counters INCLUDING ALL)`,
  );
  await db.query("INSERT INTO document_counters VALUES ('fri', 0)");
  assert.equal(
    (
      await db.query('SELECT current_schema() AS name', {
        type: QueryTypes.SELECT,
      })
    )[0].name,
    schema,
  );
  const service = new FriService(db);
  const receipts = await Promise.all(
    Array.from({ length: 4 }, () => service.create({ ...fixture })),
  );
  const records = await Promise.all(receipts.map(({ id }) => service.find(id)));
  await mkdir('../tmp/pdfs', { recursive: true });
  await writeFile('../tmp/pdfs/fri-numbered-test.pdf', await new PdfService().generate(records.find(row => row.code === 'TMB-000001')));
  assert.deepEqual(records.map((row) => row.code).sort(), [
    'TMB-000001',
    'TMB-000002',
    'TMB-000003',
    'TMB-000004',
  ]);
  await db.query(
    "ALTER TABLE fri_requests ADD CONSTRAINT test_insert_failure CHECK ((data->>'name') <> 'Forzar fallo')",
  );
  await assert.rejects(service.create({ ...fixture, name: 'Forzar fallo' }));
  assert.equal(
    (
      await db.query(
        "SELECT last_value FROM document_counters WHERE name = 'fri'",
        { type: QueryTypes.SELECT },
      )
    )[0].last_value,
    '4',
  );
  const next = await service.create({ ...fixture });
  assert.equal((await service.find(next.id)).code, 'TMB-000005');
  await db.query(
    "UPDATE document_counters SET last_value = 999999 WHERE name = 'fri'",
  );
  const large = await service.create({ ...fixture });
  assert.equal((await service.find(large.id)).code, 'TMB-1000000');
  const [{ total, distinct_codes, missing }] = await admin.query(
    'SELECT COUNT(*)::int AS total, COUNT(DISTINCT code)::int AS distinct_codes, COUNT(*) FILTER (WHERE code IS NULL)::int AS missing FROM public.fri_requests',
    { type: QueryTypes.SELECT },
  );
  assert.equal(total, distinct_codes);
  assert.equal(missing, 0);
  console.log(
    'OK: códigos consecutivos únicos, envíos simultáneos, rollback sin consumir número, códigos grandes y solicitudes existentes.',
  );
} finally {
  await db.close();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.close();
}
