import { Sequelize } from 'sequelize';
import { hash, argon2id } from 'argon2';
import { randomUUID } from 'node:crypto';
const { DATABASE_URL, SELLER_EMAIL, SELLER_PASSWORD, SELLER_NAME } =
  process.env;
if (
  !DATABASE_URL ||
  !SELLER_EMAIL ||
  !SELLER_NAME ||
  !SELLER_PASSWORD ||
  SELLER_PASSWORD.length < 12
)
  throw new Error(
    'Configura DATABASE_URL, SELLER_EMAIL, SELLER_NAME y SELLER_PASSWORD (mínimo 12 caracteres)',
  );
const db = new Sequelize(DATABASE_URL, { logging: false });
try {
  await db.query(
    'INSERT INTO sellers(id,email,name,password_hash) VALUES (:id,:email,:name,:password)',
    {
      replacements: {
        id: randomUUID(),
        email: SELLER_EMAIL.toLowerCase().trim(),
        name: SELLER_NAME,
        password: await hash(SELLER_PASSWORD, { type: argon2id }),
      },
    },
  );
  console.log('Vendedor creado');
} finally {
  await db.close();
}
