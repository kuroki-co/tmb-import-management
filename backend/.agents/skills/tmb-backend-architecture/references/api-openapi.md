# OpenAPI y contratos

- Generar el documento mediante `@nestjs/swagger`. Swagger UI permite explorar la API; el documento JSON/YAML es el contrato para generación.
- Documentar DTOs de entrada y respuesta, parámetros, estados HTTP, errores, autenticación y paginación. Asegurar que describan el comportamiento real.
- El plugin Swagger puede reducir anotaciones, pero revisar resultados: genéricos, uniones, envolturas y respuestas especiales pueden requerir metadatos explícitos.
- No exponer modelos Sequelize completos como respuesta ni asumir que TypeScript produce validación o serialización en ejecución.
- Añadir una exportación local reproducible y versionada del documento, sin arrancar un servidor HTTP o requerir servicios externos innecesarios para describir rutas.
- Al modificar contratos, actualizar el documento y regenerar `frontend/src/lib/api/generated/schema.d.ts` mediante el comando acordado de `openapi-typescript`. Comprobar que consumidores del frontend compilen.
- El frontend utiliza `openapi-fetch`; su objeto `data/error/response` no exige esa envoltura en los cuerpos del backend.
- Mantener secretos y ejemplos privados fuera del documento exportado. Configurar acceso a Swagger UI según el entorno.
