# Backend Supabase de TMB

Aplicar `.agents/skills/tmb-supabase/SKILL.md` para cambios de Supabase. Consultar Context7 para configuración, SDK, CLI y APIs actuales.

La migración SQL y la función FRI están desplegadas; el historial local fue importado y el frontend usa Supabase explícitamente. No dar por migradas sus funcionalidades porque existan clientes o carpetas nuevas. Consultar `README.md` antes de activar integraciones.

Los clientes de Next.js pertenecen a `../frontend/src/lib/supabase/`. Migraciones, políticas, funciones y tareas programadas pertenecen aquí. No desplegar cambios como parte de una comprobación local ni usar datos de clientes reales como fixtures.
