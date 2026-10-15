# Seguridad y datos

## Permisos

- Roles y activación deben venir de datos controlados por administradores o claims no editables por el usuario. No confiar en user_metadata para otorgar acceso de vendedor.
- RLS controla filas; los GRANT y la superficie de las RPC también requieren revisión. authenticated no significa vendedor. Probar usuarios sin rol y desactivados con tokens aún válidos.
- Funciones SQL: preferir SECURITY INVOKER. Para SECURITY DEFINER justificado, fijar search_path seguro, calificar objetos, revocar EXECUTE por defecto y conceder solo a los roles necesarios. Validar identidad/operación dentro de la función y no aceptar un user_id arbitrario como prueba de identidad.
- Las claves elevadas omiten RLS: cada operación que las utilice debe autorizarse explícitamente. Nunca retornar columnas internas, hashes, secretos o tokens de otras solicitudes.
- Mantener PDFs en buckets privados. Autorizar primero el registro y emitir URL firmada de duración limitada; UUID, código comercial o nombre de archivo no prueban permiso. RLS también se aplica a storage.objects para accesos con cliente público.

## Consistencia y contratos

- Usar transacciones o RPC para código consecutivo + solicitud y para transiciones automáticas. No leer-modificar-escribir desde el frontend para simular atomicidad.
- Restricciones SQL para unicidad, estado y formatos que corresponda; validar los campos FRI en servidor además de Zod en el formulario. Mantener reglas condicionales de documento/RUC20 y campos opcionales.
- Consultas de bandeja con límites y orden estable; agregar paginación cuando haga falta. No descargar todos los documentos para filtrar permisos en JavaScript.
- Generar tipos desde el proyecto/base adecuados, comprobar el diff y verificar consumidores. No inventar un Database vacío para esconder que faltan migraciones.

## Auth de Next.js

- Mantener clientes browser/server separados; cliente de servidor por petición y cookies getAll/setAll conforme a @supabase/ssr. Propagar cookies y cabeceras de renovación a la respuesta, sin cachear respuestas de sesión compartidas.
- Implementar el refresco de sesión antes de activar rutas SSR privadas. Verificar usuario/claims con el mecanismo vigente documentado y comprobar el rol activo; getSession por sí solo no autoriza una operación del servidor.
- No mezclar las sesiones NestJS y Supabase sin un plan de transición. El cambio de proveedor necesita provisionar vendedores y probar login, logout, expiración y revocación. No transformar hashes antiguos en nuevas contraseñas.
