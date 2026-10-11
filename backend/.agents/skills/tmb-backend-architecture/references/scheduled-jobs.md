# Cronjobs y seguimiento del FRI

## Funcionalidad acordada

El cliente completa el FRI, queda registrado con su correo y recibe su PDF. Después se le envía un correo de seguimiento cada tres días para consultar si continúa interesado. WhatsApp no forma parte de este seguimiento.

La condición de detención y el máximo de intentos siguen pendientes. No implementar envíos indefinidos ni inventar cuándo se cierra el seguimiento: acordar esa regla antes de activar la recurrencia real. Precisar también qué evento de entrega del PDF inicia el plazo, porque aceptación por un proveedor no demuestra recepción o lectura.

## Persistencia y ejecución

- Guardar estado del seguimiento, próxima fecha de envío, último envío e historial de intentos en PostgreSQL.
- Usar `@nestjs/schedule` para buscar periódicamente trabajos vencidos; no crear un cron en memoria por cliente ni depender de temporizadores que se pierdan al reiniciar.
- Programar cada plazo respecto del evento acordado; no usar un cron global de cada tercer día del mes para representar tres días por cliente.
- Reclamar trabajos de forma atómica y usar bloqueos o leases para evitar procesamiento simultáneo entre instancias. Definir recuperación de trabajos interrumpidos.
- Asignar una identidad única por envío programado y registrar estados. Reconocer el caso de caída después de aceptación SMTP y antes de persistir: no prometer entrega exactamente una vez; reconciliar resultados ambiguos antes de reintentar cuando sea posible.
- Comprobar que el seguimiento siga activo antes de enviar. Avanzar la fecha solo según el resultado y política acordados, no ocultar fallos como éxito.
- Separar reintentos técnicos de la cadencia comercial de tres días; limitar reintentos y conservar fallos visibles.
- Procesar lotes acotados y respetar límites del proveedor. No mantener transacciones SQL abiertas durante la llamada SMTP.
- Tras un reinicio, recuperar seguimientos vencidos sin enviar todos los intervalos perdidos de golpe; acordar la política de recuperación.
- Evaluar BullMQ y Redis si volumen o ejecución requieren una cola; PostgreSQL y schedule son la base inicial.

Probar fechas, detención, concurrencia, fallos y recuperación con reloj controlado y transporte simulado, sin esperar tres días ni enviar correos reales.
