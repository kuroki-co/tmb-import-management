# Backend objetivo de TMB: Supabase

Proyecto vinculado: `zsnmycclgvkiyyzdmspc` (tmb-managment). La migración SQL y la función `fri-api` están desplegadas. El vendedor local fue provisionado en Supabase Auth con las credenciales existentes, sin enviar correos. El registro público de vendedores está desactivado.

## Estado del cambio

El frontend selecciona explícitamente el proveedor con `NEXT_PUBLIC_BACKEND_PROVIDER=supabase` o `nest`; si falta la variable, mantiene NestJS. La URL/clave por sí solas no cambian el proveedor. **Supabase está activo en `frontend/.env.local`.** El 15/10/2026 se importó la solicitud local, conservando UUID, datos, fecha, estado, código y hash del recibo. Contador verificado en 1 (`TMB-000001`); el siguiente código es `TMB-000002`. El vendedor conserva sus credenciales y los envíos están habilitados. NestJS y el volumen local se conservan como respaldo, sin ejecutar el servidor anterior.

## Funcionalidades implementadas

- Login/logout con Supabase Auth y autorización de vendedor activo comprobada en la función y RLS.
- FRI público con validación autoritativa, límites persistentes por IP/documento/celular y límite global. Token aleatorio de recibo, guardado como hash y usado también para reintentar sin duplicar solicitudes.
- Listado privado de hasta 500 solicitudes; revisión atómica al abrir detalle, sin retroceder estados ni permitir cambios manuales.
- PDF generado bajo demanda en Edge con PDFKit y fuentes Carlito incluidas (OFL). Descarga privada por sesión o token de recibo. No se almacena en Storage todavía porque la aplicación anterior también lo generaba bajo demanda.
- La implementación local de cotizaciones incluye configuración base, tipo de cambio, cálculo del Excel y excepciones guardadas por solicitud. La migración `20261016000100_quotations.sql` y las acciones Edge de cotización todavía requieren desplegarse para que el módulo funcione contra el proyecto remoto.
- El catálogo de vehículos usa `20261023000100_vehicle_catalog.sql`: importa las 318 variantes únicas con precio de la columna `FOB (USD)` del Excel de proveedora. El extractor de Hilux Perú guarda por separado precios y etiquetas tal como aparecen en su web; inicialmente quedan sin publicar para revisión.
- La extracción web corre en lotes pequeños y conserva el último catálogo válido ante errores o cambios del HTML. Para completar una extracción extensa, configurar el Cron descrito en `scripts/schedule-vehicle-catalog.sql` y guardar el mismo secreto aleatorio en Edge Secrets y Vault; revisar el catálogo desde el panel antes de publicar registros web.
- Tras desplegar, establece `VEHICLE_CATALOG_SYNC_SECRET` en Supabase con `pnpm dlx supabase@2.120.0 secrets set VEHICLE_CATALOG_SYNC_SECRET="<token-aleatorio-largo>"`; coloca ese mismo token, la URL del proyecto y la clave publishable/anon en los tres placeholders del script Vault/Cron. Habilita `pg_cron` y `pg_net` en Database → Extensions antes de ejecutar el SQL una sola vez.
- Resend usa el dominio verificado `tmbimporta.com`; sus credenciales permanecen en Edge Secrets. El FRI permite indicar un correo opcional y, después de registrar la solicitud, envía una confirmación con el código. El panel limita las pruebas manuales del vendedor a tres por hora. No se activan recordatorios; ver `RESEND_SETUP.md`.

## Estructura

- `migrations/`: tablas y funciones transaccionales versionadas.
- `functions/fri-api/`: entrada HTTP con acciones explícitas y autorización.
- `functions/_shared/`: validación y generador PDF.
- `tests/`: validación Deno y pruebas SQL transaccionales que terminan en rollback.
- `scripts/prepare-import.ts`: genera una transacción de importación desde el export de NestJS.
- `../frontend/src/lib/supabase/`: clientes, transporte y tipos generados.

## Procedimiento de importación (ya ejecutado)

Detener nuevas escrituras en el backend de origen durante el traspaso. Desde `backend/`:

```bash
node --env-file=.env scripts/export-supabase.mjs
```

Desde la raíz:

```bash
pnpm dlx deno run --allow-read --allow-write supabase/scripts/prepare-import.ts
pnpm dlx supabase@2.120.0 db query --linked --file tmp/migration/import-supabase.sql
```

El export y la transacción contienen datos privados y permanecen en `tmp/`, excluido de Git. El import no sobrescribe registros incompatibles ni reinicia el contador. Comparar registros, recibos y contador antes de activar. Provisionar los vendedores adicionales con Auth Admin y la tabla `tmb_sellers`; las sesiones NestJS no se trasladan.

La función rechaza nuevos envíos hasta activar el secreto `FRI_ACCEPT_SUBMISSIONS=true` una vez verificado el historial y el contador.

Después, establecer `NEXT_PUBLIC_BACKEND_PROVIDER=supabase` en `frontend/.env.local`, reiniciar Next.js e iniciar sesión. Mantener `backend/` y su volumen como respaldo hasta verificar el flujo y los datos; no hacer escrituras en ambos proveedores.

## Verificación y despliegue

```bash
pnpm dlx deno check supabase/functions/fri-api/index.ts
pnpm dlx deno test --allow-env supabase/tests/validation.test.ts
pnpm dlx deno test --allow-env supabase/tests/vehicle-catalog.test.ts
pnpm dlx supabase@2.120.0 db query --linked --file supabase/tests/invariants.sql
pnpm dlx supabase@2.120.0 db query --linked --file supabase/tests/authorization.sql
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
```

Las pruebas SQL revierten sus cambios. No usar solicitudes reales como fixtures. Generar tipos con `supabase gen types typescript --linked --schema public` y comprobar la salida antes de reemplazar `frontend/src/lib/supabase/database.types.ts`.

Despliegue autorizado desde la raíz: `pnpm dlx supabase@2.120.0 db push`, seguido de `pnpm dlx supabase@2.120.0 functions deploy fri-api --use-api`. Puede desplegar sin Docker. `verify_jwt=false` permite recibos/formulario anónimos; las operaciones privadas verifican JWT con Auth y vendedor activo dentro del handler. Las RPC de creación/recibo solo son ejecutables por service_role.

`FRONTEND_ORIGINS` en los secretos de Edge contiene los orígenes exactos permitidos, separados por comas; por defecto solo localhost. Configurarlo con el dominio real al publicar. No publicar claves elevadas en Next.js. El cliente browser renueva la sesión en el panel cliente; antes de añadir consultas privadas SSR, conectar renovación de cookies y headers por petición.
