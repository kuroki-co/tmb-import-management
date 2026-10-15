import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const rootEnv = resolve('..', '.env');
const backendEnv = resolve('.env');
if (existsSync(rootEnv) || existsSync(backendEnv))
  throw new Error('Ya existe configuración local; no se sobrescribe.');
const password = randomBytes(24).toString('hex');
writeFileSync(rootEnv, `TMB_DB_PASSWORD=${password}\n`);
writeFileSync(
  backendEnv,
  `DATABASE_URL=postgres://tmb:${password}@localhost:55432/tmb\nJWT_SECRET=${randomBytes(48).toString('hex')}\nFRONTEND_URL=http://localhost:3000\nPORT=3001\nSELLER_EMAIL=vendedor@tmb.local\nSELLER_NAME=Equipo TMB\nSELLER_PASSWORD=${randomBytes(18).toString('base64url')}\n`,
);
console.log('Configuración local creada. Credenciales en backend/.env.');
