# Frontend TMB

Next.js App Router, React Hook Form, Zod y Tailwind. El backend activo es Supabase.

## Iniciar

Copiar `.env.example` a `.env.local` solo si este archivo no existe y configurar URL y publishable key del proyecto. Mantener `NEXT_PUBLIC_BACKEND_PROVIDER=supabase`.

```bash
pnpm install
pnpm dev
```

Formulario: http://localhost:3000/fri. Panel: http://localhost:3000/login.

No hace falta iniciar NestJS ni Docker. El vendedor existente conserva sus credenciales de acceso. No publicar secretos en variables `NEXT_PUBLIC_*`.

## Contratos y verificación

El transporte está en `src/lib/supabase/`; las llamadas por funcionalidad en `src/features/*/api.ts`. Tipos de base generados y respuestas de Edge Functions validadas con Zod. El cliente NestJS se conserva únicamente como compatibilidad explícita con el proveedor legado.

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Consultar [el backend Supabase](../supabase/README.md) para funciones, migraciones, permisos y despliegue. Antes de publicar en Vercel, configurar las mismas variables públicas y el dominio exacto en `FRONTEND_ORIGINS` de Edge Functions.
