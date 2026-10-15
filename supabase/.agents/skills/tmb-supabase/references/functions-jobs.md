# Funciones y trabajos

## Edge Functions

- Validar entrada, método, tamaño, autenticación y autorización en cada operación; CORS no autoriza. Para formularios anónimos, incorporar protección contra abuso antes de habilitar escritura pública.
- Usar configuración secreta del entorno y dependencias explícitas compatibles con el runtime. Consultar límites actuales de CPU, memoria y duración antes de elegir un generador de PDF; medir con datos reales de prueba.
- Separar lógica reutilizable de HTTP cuando reduzca duplicación real. Normalizar errores sin devolver trazas, datos personales ni claves. No registrar payloads completos de clientes.
- Confirmar generación visual de PDFs normales y largos. Mantener las fuentes y su licencia, descargar únicamente tras verificar acceso y conservar el éxito del FRI si falla una operación posterior.

## Correos y recordatorios

- Resend por HTTP desde una función; configurar remitente/dominio y usar destinatarios de prueba. No enviar desde el navegador con la clave del proveedor ni asumir que el SMTP de Auth sirve para campañas/seguimientos.
- Guardar next_send_at, intentos y resultados. Cron consulta vencidos y reclama trabajos atómicamente para evitar trabajadores simultáneos. Una expresión que corre cada tres días en calendario no representa tres días desde cada solicitud.
- Usar claves de idempotencia estables por solicitud y ocurrencia cuando el proveedor lo soporte. Un timeout después del envío no prueba que no se entregó; manejar resultados ambiguos antes de reintentar.
- Reintentos limitados con demora, registro de fallo final y recuperación de trabajos reclamados abandonados. No usar setInterval ni tareas en memoria como garantía de envío.
- Verificar ausencia de correo, estados/condiciones de salida, máximo de seguimientos y siguiente fecha antes de activar. Las condiciones comerciales pendientes se consultan al usuario cuando se implemente el flujo, sin inventar estados nuevos.
- Proteger invocaciones de Cron con credencial privada validada por el worker y almacenada de forma segura (por ejemplo Vault). Una publishable key no autentica un trabajo privilegiado.
