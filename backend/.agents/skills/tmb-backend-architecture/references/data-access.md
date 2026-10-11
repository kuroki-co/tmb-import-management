# PostgreSQL y Sequelize

- Usar modelos y consultas de Sequelize según documentación vigente y compatibilidad de la integración NestJS.
- Versionar cambios mediante migraciones y un comando reproducible. No usar sincronización automática destructiva en producción ni editar migraciones ya aplicadas.
- Mantener nombres SQL consistentes en `snake_case`, identificadores y relaciones explícitos.
- Aplicar restricciones únicas y claves foráneas para integridad; una comprobación previa en un service no sustituye una restricción ante concurrencia.
- Usar transacciones para cambios que deban persistir juntos. No mantener una transacción abierta durante envíos externos.
- Parametrizar SQL y limitar campos de entrada/salida. Evitar consultas sin límites en listados y documentar paginación.
- Guardar fechas de programación como instantes consistentes; acordar la zona horaria para presentación y reglas de calendario.
- No imponer un repositorio por tabla ni clases CRUD genéricas.
