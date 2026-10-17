import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { Sequelize } from 'sequelize';
const base = 'http://localhost:3001';
const origin = process.env.FRONTEND_URL;
const db = new Sequelize(process.env.DATABASE_URL, { logging: false });
let id;
let cookie;
const headers = { 'Content-Type': 'application/json', Origin: origin };
const fixture = {
  documentType: 'DNI',
  documentNumber: '01234567',
  name: 'Cliente de prueba técnica',
  department: 'Arequipa',
  mobile: '999123456',
  brand: 'Toyota',
  model: 'Corolla Cross',
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
  equipment: 'Equipamiento de prueba',
  observations:
    'Registro sintético para verificar el flujo. Se elimina al terminar.',
};
try {
  assert.equal((await fetch(`${base}/fri`)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/fri`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...fixture, documentNumber: '123' }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/fri`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...fixture, unexpected: true }),
      })
    ).status,
    400,
  );
  const create = await fetch(`${base}/fri`, {
    method: 'POST',
    headers,
    body: JSON.stringify(fixture),
  });
  assert.equal(create.status, 201);
  const receipt = await create.json();
  id = receipt.id;
  const publicData = await fetch(
    `${base}/fri/receipt/${id}?token=${receipt.receiptToken}`,
  );
  assert.equal(publicData.status, 200);
  const saved = await publicData.json();
  assert.equal(saved.data.documentNumber, '01234567');
  assert.equal(saved.status, 'Pendiente a revisar');
  assert.equal(
    (await fetch(`${base}/fri/receipt/${id}?token=${'0'.repeat(64)}`)).status,
    404,
  );
  const pdf = await fetch(
    `${base}/fri/receipt/${id}/pdf?token=${receipt.receiptToken}`,
  );
  assert.equal(pdf.status, 200);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  await mkdir('../tmp/pdfs', { recursive: true });
  await writeFile('../tmp/pdfs/fri-test.pdf', bytes);
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: process.env.SELLER_EMAIL,
      password: process.env.SELLER_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  cookie = login.headers.get('set-cookie').split(';')[0];
  const privateHeaders = { ...headers, Cookie: cookie };
  const reviewUrl = `${base}/fri/${id}/review`;
  assert.equal(
    (await fetch(reviewUrl, { method: 'POST', headers })).status,
    401,
  );
  assert.equal(
    (
      await fetch(reviewUrl, {
        method: 'POST',
        headers: { ...privateHeaders, Origin: 'https://invalid.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await (
        await fetch(`${base}/fri/${id}`, { headers: privateHeaders })
      ).json()
    ).status,
    'Pendiente a revisar',
  );
  const reviews = await Promise.all(
    [1, 2].map(() =>
      fetch(reviewUrl, { method: 'POST', headers: privateHeaders }),
    ),
  );
  for (const review of reviews) {
    assert.equal(review.status, 200);
    assert.equal((await review.json()).status, 'En revisión');
  }
  for (const status of ['Cotizado', 'Confirmado a compra']) {
    await db.query('UPDATE fri_requests SET status = :status WHERE id = :id', {
      replacements: { id, status },
    });
    const unchanged = await fetch(reviewUrl, {
      method: 'POST',
      headers: privateHeaders,
    });
    assert.equal((await unchanged.json()).status, status);
  }
  const list = await fetch(`${base}/fri`, { headers: privateHeaders });
  assert.equal(list.status, 200);
  assert.ok((await list.json()).some((row) => row.id === id));
  assert.equal(
    (await fetch(`${base}/fri/${id}`, { headers: privateHeaders })).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: privateHeaders,
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/auth/me`, { headers: privateHeaders })).status,
    401,
  );
  console.log(
    'OK: validación, persistencia, recibo privado, PDF, login, bandeja y revocación de sesión.',
  );
} finally {
  if (id)
    await db.query('DELETE FROM fri_requests WHERE id = :id', {
      replacements: { id },
    });
  await db.close();
}
