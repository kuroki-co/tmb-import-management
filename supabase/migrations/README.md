# Migraciones previstas

Crear migraciones con `supabase migration new` desde la raíz. La migración `20261014000100_fri.sql` está aplicada al proyecto TMB. Las pruebas de permisos y transacciones viven en `../tests/`. No editar esta migración ya aplicada; crear una nueva para cambios posteriores.

Preservar el contrato existente: solicitudes con UUID, código TMB consecutivo y único, datos FRI, fecha y estado. El contador debe asignarse en la misma transacción que el registro; nunca calcular `max + 1` en el navegador. Mantener los códigos existentes al importar y situar el contador en su máximo, sin reutilizar números.

Separar acceso de vendedores activos del envío anónimo. Proteger todas las tablas expuestas con RLS y GRANT explícitos. El envío público no debe otorgar lectura general ni escritura libre en la tabla: usar una operación limitada con validación del servidor y protección contra abuso. Conservar accesos a recibos mediante tokens aleatorios de alta entropía y hashes, sin exponerlos por listados.

Abrir un detalle cambia únicamente `Pendiente a revisar` a `En revisión`, de manera atómica. No permitir editar estados desde el navegador ni retroceder solicitudes cotizadas/confirmadas. Los demás disparadores siguen pendientes de definición.

Probar anónimo, vendedor activo, usuario autenticado sin rol y vendedor desactivado; además de concurrencia, rollback y consultas a PDFs/recibos ajenos. No activar políticas permisivas para resolver un error de integración.
