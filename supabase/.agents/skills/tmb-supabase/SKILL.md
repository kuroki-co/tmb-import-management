---
name: tmb-supabase
description: Implementar y revisar el backend Supabase de TMB, sus migraciones, permisos, Auth, Storage y Edge Functions. Usar al trasladar lógica desde NestJS o trabajar con datos, PDFs, notificaciones y recordatorios en Supabase; no para cambios exclusivamente visuales.
---

# Supabase de TMB

Trabajar en `supabase/`; los clientes de Next.js viven en `frontend/src/lib/supabase/`. Respetar AGENTS.md y consultar Context7 para APIs, CLI y comportamiento actual. Revisar primero `supabase/README.md`: la estructura preparada no implica que el backend activo esté migrado.

## Límites y decisiones

- PostgreSQL, Supabase Auth, Storage privado y Edge Functions. Resend por HTTP para correos y Meta Cloud API para WhatsApp cuando se configuren. Usar Cron de Supabase para seguimientos persistentes.
- Mantener Single Responsibility y Open/Closed mediante funciones con responsabilidades coherentes y composición cuando haya variantes reales. Evitar capas y proveedores genéricos sin una necesidad concreta.
- El navegador puede usar URL y publishable key; nunca secret key, service_role ni claves de proveedores. Validación del formulario ayuda al usuario; las garantías del negocio y permisos pertenecen a SQL/funciones.
- Habilitar RLS en todas las tablas expuestas, declarar GRANT explícitos y distinguir identidad autenticada de permiso de vendedor. No habilitar registro público de vendedores. Nunca resolver permisos desactivando RLS.
- Usar tipos generados de la base real para tablas/RPC; esquemas de entrada/salida para funciones HTTP. No conservar OpenAPI de NestJS como autoridad sobre una funcionalidad ya migrada, ni cambiar contratos de funcionalidades que todavía dependen de NestJS.
- Aplicar migraciones versionadas; no modificar una migración compartida ya aplicada ni usar cambios manuales del dashboard como única fuente del esquema. Un reset local solo procede sobre una base de pruebas conocida.

## Referencias por tarea

- [Seguridad y datos](references/security-data.md): políticas RLS, RPC, Auth y Storage.
- [Funciones y seguimientos](references/functions-jobs.md): PDFs, correos, Cron y fallos parciales.
- Para trasladar funcionalidades existentes, leer también `../../../README.md`, `../../../migrations/README.md` o `../../../functions/README.md` según la tarea. Estos archivos describen el estado y las reglas de negocio, sin duplicarlas en la skill.

## Verificación

Probar rutas permitidas y denegadas: anónimo, vendedor activo, autenticado sin rol y vendedor desactivado. Verificar códigos simultáneos, rollback, acceso a recibos/PDFs y revisión sin retrocesos. Para trabajos externos, comprobar reintentos y duplicados con destinatarios de prueba; no enviar a clientes reales por validar una función.

Preparar el código y las comprobaciones locales dentro del alcance autorizado. Un despliegue, envío externo o cambio de datos reales requiere autorización para esa acción; la creación de una skill no la concede. Comunicar qué se verificó localmente y qué necesita un proyecto configurado, sin dar por migrado ni desplegado lo que solo se preparó.
