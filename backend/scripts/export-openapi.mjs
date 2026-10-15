import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  ['dist/main.js', '--export-openapi'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgres://localhost/tmb',
      JWT_SECRET:
        process.env.JWT_SECRET ||
        'schema-export-only-no-runtime-authentication',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
  },
);
process.exit(result.status ?? 1);
