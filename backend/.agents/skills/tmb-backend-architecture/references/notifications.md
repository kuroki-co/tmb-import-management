# Correo y WhatsApp

- Usar un provider de correo con Nodemailer y un transporter reutilizable. Configurar SMTP y remitente mediante configuración; proveedor pendiente.
- Mantener plantillas y composición de mensajes separadas de reglas de seguimiento. Incluir alternativa de texto para correos HTML cuando corresponda.
- Registrar identificador, estado e intentos sin guardar secretos o contenido privado innecesario. Aceptación SMTP no equivale a entrega en bandeja ni lectura.
- Usar Cloud API de Meta para WhatsApp y consultar requisitos actuales de plantillas, ventanas de conversación y webhooks al implementar.
- Validar autenticidad de webhooks y procesar eventos repetidos de forma idempotente.
- Los seguimientos cada tres días del FRI se envían por correo, no por WhatsApp.
- Aplicar políticas de cancelación y preferencias del destinatario acordadas. No enviar a clientes reales durante pruebas sin autorización específica.
