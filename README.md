# TMB Import Management

Formulario FRI y panel de vendedores con Next.js, React Hook Form, Zod y Tailwind. Backend activo en Supabase: PostgreSQL, Auth y Edge Functions con PDFKit.

El historial local se migró conservando datos, códigos y recibos. `backend/` y su volumen PostgreSQL se mantienen como respaldo; no necesitan ejecutarse. Ver [documentación Supabase](supabase/README.md).

## Desarrollo local

Requisitos: Node.js compatible y pnpm. Configurar `frontend/.env.local` siguiendo `.env.example`, con proveedor `supabase`, URL y publishable key.

```bash
pnpm --dir frontend install
pnpm --dir frontend dev
```

- Panel/login: http://localhost:3000/login
- Formulario público: http://localhost:3000/fri

El vendedor existente conserva sus credenciales. No hay registro público de vendedores. Los secretos de Edge Functions permanecen en Supabase.

## Comprobaciones

```bash
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

Las pruebas de permisos, transacciones y validación del backend están documentadas en `supabase/README.md`. Los contratos actuales usan tipos de Supabase y esquemas Zod; OpenAPI queda para el proveedor NestJS legado.

## Alcance actual

Formulario de cuatro pasos, confirmación con resumen, persistencia real, página de éxito con PDF, login de vendedores, bandeja con búsqueda y filtros, detalle y preview del formulario sin guardar solicitudes. Los vendedores autorizados comparten la bandeja, limitada a las últimas 500 solicitudes.

El comprobante público utiliza un token almacenado en la sesión del navegador que hizo el envío. Los vendedores autenticados pueden consultar el detalle y el PDF. La autenticación usa Supabase Auth y requiere HTTPS en producción.

Cada FRI recibe automáticamente un código único y consecutivo TMB-000001, visible en el detalle y el PDF. Al abrir el detalle un vendedor autenticado, una solicitud pendiente pasa automáticamente a En revisión. Los estados no se editan manualmente ni retroceden al consultar otra vez. Correo, WhatsApp y recordatorios no están activados. Las acciones para cotizar y confirmar compra, reparto por vendedor y paginación quedan para la siguiente etapa. Las reglas del formulario están en `docs/FRI.md`; cada aplicación conserva sus skills en `.agents/skills/` y su propio lockfile.
