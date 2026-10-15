# Primera versión de TMB

Panel vendedor autenticado, solicitudes FRI, detalle y preview del mismo formulario público. El envío crea un registro y dirige a una página de éxito con PDF, sin correo ni recordatorios activos.

Estados de solicitudes: Pendiente a revisar (inicial), En revisión, Cotizado y Confirmado a compra. No se cambian manualmente: al abrir el detalle un vendedor autenticado inicia la revisión de una solicitud pendiente. Abrir el comprobante público o el PDF no inicia revisión. Volver a abrir el detalle no retrocede estados posteriores. Las acciones que dispararán Cotizado y Confirmado a compra quedan por definir.

## Documento del cliente

- DNI: exactamente 8 dígitos.
- RUC: exactamente 11 dígitos, con prefijo 10 o 20.
- CE: formato flexible de 1 a 30 caracteres, letras, números o guion.
- Pasaporte: de 1 a 30 caracteres alfanuméricos y país emisor obligatorio.

El campo limita caracteres y longitud mientras se escribe o pega, preserva ceros iniciales y se limpia al cambiar el tipo de documento. La validación de formato se aplica al continuar, al enviar y en el backend; no implica verificación de identidad ante un organismo externo.

## Recuperación del formulario

El formulario público guarda sus datos parciales y el paso actual en localStorage del mismo navegador. Se restaura después de recargar, salir y volver o cerrar y abrir la pestaña. No crea solicitudes en la base de datos hasta el envío. El borrador se elimina tras un envío exitoso; si el envío falla, se conserva. El preview del vendedor no lee ni escribe el borrador del cliente. El botón «Empezar de nuevo» limpia los datos del formulario. Si el navegador bloquea el almacenamiento, se informa en pantalla.

## Experiencia de uso

La confirmación presenta un resumen por secciones con edición directa y regreso al resumen. Borrar el borrador requiere confirmación. En móvil se muestra un progreso compacto y las acciones del formulario permanecen visibles. Los errores se identifican con texto, borde y atributos accesibles; hay ayudas en campos técnicos. Enter avanza en los pasos intermedios y el envío se realiza en confirmación. La bandeja tiene actualización manual y hora de última actualización, con estados diferenciados por texto, icono y color. El detalle muestra los datos del cliente en lectura; el PDF solo se descarga. El éxito explica la revisión posterior sin prometer plazos ni envío de correo.

## Decisiones pendientes

- Desarrollo local configurado con PostgreSQL en Docker (puerto 55432) y un vendedor inicial; sus credenciales están en `backend/.env`.
- Asignación de solicitudes entre vendedores: inicialmente todos los vendedores autorizados comparten la bandeja, sin asignación inventada.
- Código del FRI: generado automáticamente como TMB-000001, TMB-000002, etc., mediante contador persistente y transacción de PostgreSQL. Es único, no se reinicia al reiniciar el servidor y un fallo al guardar no consume el número. Las solicitudes existentes se numeran por fecha de creación. No se deben borrar solicitudes registradas ni reiniciar el contador: anular o archivar un registro no libera su número.
- Formulario actual de cuatro pasos: Cliente, Vehículo, Condiciones y Confirmación. Correo e Investigación ya no se solicitan.
- Condiciones exige presupuesto y una decisión explícita Sí/No a «¿Tiene un proveedor de preferencia?». Con Sí son obligatorios proveedor, Incoterm (FOB/FCA/CIF/CFR/EXW), fecha estimada de compra, forma de pago y aceptación Sí/No de alternativas equivalentes. Con No se omiten y se limpian esos datos, pasando directamente al resumen. Puerto fijo: Callao, Perú.
- Cliente, celular, departamento, marca, modelo, año, cantidad, combustible, transmisión y declaración siguen siendo obligatorios. Versión, color, potencia, autonomía, representante legal, empresa, cargo y equipamiento son opcionales.
- PDF: proveedor e Incoterm figuran en Condiciones comerciales. Investigación conserva Uso del vehículo, País de origen preferido y Observaciones completamente vacíos. El correo se retira del PDF.
- Los registros históricos siguen siendo legibles. Borradores del formato anterior conservan los campos vigentes y vuelven a Condiciones si ya habían llegado a ese paso, para confirmar la nueva decisión sobre proveedor.
- RUC admitido inicialmente: prefijos 10 y 20; otros prefijos requieren revisión.
- Autonomía se expresa en km y solo aparece para eléctrico; potencia se captura como texto con unidad incluida.
- Recordatorios y correo quedan desactivados hasta configurar proveedor y reglas de cierre.
