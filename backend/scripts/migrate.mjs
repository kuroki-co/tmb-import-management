import { Sequelize } from 'sequelize';
import { readFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL');
const db = new Sequelize(process.env.DATABASE_URL, { logging: false });
try {
  await db.transaction(async (transaction) => {
    await db.query('SELECT pg_advisory_xact_lock(740011)', { transaction });
    await db.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)',
      { transaction },
    );
    for (const name of ['001-initial', '002-fri-statuses', '003-fri-codes']) {
      const [rows] = await db.query(
        'SELECT name FROM schema_migrations WHERE name = :name',
        { replacements: { name }, transaction },
      );
      if (rows.length) continue;
      await db.query(
        await readFile(
          new URL(`../migrations/${name}.sql`, import.meta.url),
          'utf8',
        ),
        { transaction },
      );
      await db.query('INSERT INTO schema_migrations(name) VALUES (:name)', {
        replacements: { name },
        transaction,
      });
    }
  });
  console.log('Migraciones aplicadas');
} finally {
  await db.close();
}
