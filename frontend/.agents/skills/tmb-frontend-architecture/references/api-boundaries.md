# Acceso y contratos de la API NestJS

## Transición a Supabase

Estas reglas aplican a operaciones que siguen usando NestJS. Para una operación migrada, usar los clientes de `src/lib/supabase/`, tipos generados de la base y la autorización implementada en Supabase; mantener el transporte específico en la funcionalidad. Consultar `supabase/README.md` desde la raíz y la skill `supabase/.agents/skills/tmb-supabase/SKILL.md`. No activar el cambio de proveedor solo por detectar variables de entorno. El frontend nunca debe contener secret keys ni omitir RLS/validación del servidor por usar el SDK directamente.

## Responsabilidades

- Ubicar llamadas específicas en la funcionalidad propietaria, por ejemplo `src/features/<feature>/api.ts`.
- Centralizar URL base, transporte y normalización de errores comunes en `src/lib/api/` cuando exista consumo real. Usar `openapi-fetch` como cliente tipado; no introducir Axios ni un segundo cliente HTTP sin una necesidad concreta.
- Mantener componentes de presentación ajenos a endpoints, cabeceras y detalles HTTP. Una página o controlador de interacción puede coordinar la carga; no trasladar cada solicitud trivial a una cadena de capas.
- NestJS conserva validación autoritativa, permisos, persistencia y reglas del negocio. El frontend puede validar para dar feedback, pero no constituye la garantía de seguridad.

## Contratos generados con OpenAPI

- Usar el documento OpenAPI generado por NestJS como fuente del contrato HTTP. Swagger UI es una interfaz de documentación; generar tipos desde el documento JSON o YAML, no desde su página HTML.
- Generar los tipos mediante `openapi-typescript` en `src/lib/api/generated/schema.d.ts`. No editar ese archivo manualmente ni duplicar sus DTOs en cada funcionalidad.
- Crear el cliente de `openapi-fetch` con el tipo `paths` generado. Derivar tipos de solicitudes y respuestas de las operaciones o esquemas generados, sin usar `any` o conversiones forzadas para ocultar incompatibilidades.
- Mantener las llamadas de cada funcionalidad en su `api.ts`: el cliente común gestiona el transporte, la funcionalidad conoce la operación y los mappers adaptan los datos para la pantalla.
- Al implementar la generación, añadir un comando reproducible de pnpm, como `api:generate`, con origen y salida explícitos. Preferir un documento exportado localmente y versionado para que la generación y CI no dependan de un servidor en ejecución. Si se usa una URL, documentar qué backend debe estar disponible.
- Conservar los tipos generados en Git para permitir compilar el frontend sin arrancar NestJS. No incluir secretos, credenciales ni ejemplos privados en el documento exportado.
- Cuando cambie el contrato del backend, actualizar el documento, regenerar los tipos y comprobar sus consumidores con TypeScript y la compilación. Configurar una comprobación de diferencias en CI cuando exista ese flujo.
- Si faltan respuestas, errores o metadatos de paginación en OpenAPI, corregir la documentación del backend; no inventar contratos locales para compensar un esquema incompleto.
- La generación aporta tipos estáticos, no validación del JSON en ejecución ni garantía de que el servidor cumpla el contrato. Comprobar el comportamiento real cuando se modifiquen operaciones.

## Solicitudes, respuestas y formularios

- Revisar los endpoints y contratos del backend antes de implementar consumidores. Acordar cambios que afecten a ambas aplicaciones y actualizar consumidores pertinentes.
- Derivar tipos de entrada y salida del contrato generado. No inventar una envoltura universal como `{ data, success }` sin acuerdo con el backend. El objeto que devuelve `openapi-fetch` con `data`, `error` y `response` pertenece al cliente; no implica que el cuerpo HTTP tenga esa estructura.
- Para listas paginadas, acordar datos, metadatos y semántica de parámetros con NestJS; no asumir paginación por página o cursor.
- Separar DTO de API, valores de formulario y modelo de presentación cuando sus responsabilidades o formas difieran. Reutilizar el tipo cuando coincidan, sin duplicarlo mecánicamente.
- Usar React Hook Form y esquemas Zod locales a la funcionalidad para formularios de creación y edición. Inferir los tipos del esquema y distinguir entrada/salida si existen transformaciones. Estos esquemas validan la interacción del usuario; no reemplazan los tipos OpenAPI ni la validación de NestJS.
- Adaptar los valores validados al cuerpo de solicitud generado cuando difieran: campos de confirmación, vacíos, números o fechas. No enviar campos exclusivos de la interfaz por propagación indiscriminada.
- Usar mappers explícitos cuando la pantalla necesite transformaciones: fechas, campos derivados o agrupación. Mantener esas transformaciones fuera del transporte genérico.
- Recordar que TypeScript no valida JSON en ejecución. Validar respuestas cuando su confiabilidad o impacto lo justifique, usando herramientas existentes; no instalar una librería de esquemas por activar esta skill.
- Tratar fechas JSON según el formato acordado y convertirlas explícitamente si se requieren objetos `Date`. No asumir que un tipo declarado realiza esa conversión.
- Leer el cuerpo según estado y contenido: contemplar respuestas sin cuerpo, como 204, y errores no JSON. No intentar parsear toda respuesta como JSON exitoso.

## Errores y sesión

- Distinguir fallo de red, respuesta HTTP fallida y errores del negocio cuando el contrato lo permita. No convertir errores en arrays vacíos o resultados exitosos.
- Normalizar errores comunes conservando código, estado y contexto útil. Mostrar mensajes comprensibles sin exponer trazas o detalles internos del backend.
- Representar errores de campos solo si el backend proporciona un contrato que permita asociarlos al formulario.
- Aplicar cabeceras, cookies, renovación de sesión y comportamiento ante 401/403 según la estrategia acordada. No asumir almacenamiento de tokens en `localStorage` ni renovación automática.
- Mantener claves privadas en el servidor. Las variables públicas de Next.js son visibles al navegador; una URL pública de API no es un secreto.
- No reintentar mutaciones automáticamente sin considerar idempotencia y duplicación. Decidir cancelación y reintentos según el flujo.

## Comprobación

Verificar éxito, error y estados sin cuerpo cuando correspondan. Al cambiar un contrato, comprobar sus consumidores y transformaciones. Las pruebas deben cubrir comportamiento significativo, no reproducir la implementación del cliente HTTP.
