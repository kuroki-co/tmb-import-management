# Validación y errores

- Validar DTOs de entrada con `class-validator` y `class-transformer`, utilizando ValidationPipe conforme a la versión instalada.
- Definir tratamiento de campos desconocidos, valores opcionales, vacíos y conversiones. Evitar coerciones implícitas ambiguas.
- Validar reglas del negocio en services y restricciones de integridad en PostgreSQL.
- Acordar un contrato de errores HTTP consistente con códigos estables y mensajes comprensibles; documentarlo en OpenAPI. No inventar envolturas de respuesta antes de acordarlas.
- Distinguir errores de entrada, autenticación, permisos, recurso inexistente, conflicto y fallo interno.
- Preservar contexto técnico en logs sin exponer trazas, SQL ni secretos al cliente.
- Para errores de formulario, definir rutas o nombres de campos que el frontend pueda asociar al contrato; no depender del texto del mensaje para tomar decisiones.
