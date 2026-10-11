# Configuración

- Usar `@nestjs/config` y validar configuración necesaria al arrancar los módulos que la utilizan.
- Mantener credenciales de PostgreSQL, JWT, SMTP y Meta en variables de entorno o un gestor de secretos. Nunca incluirlas en Git, respuestas o logs.
- Crear ejemplos de variables con valores ficticios cuando se implementen integraciones; no exigir credenciales de funcionalidades todavía no activadas.
- Diferenciar desarrollo, pruebas y producción; pruebas de notificaciones deben usar transportes simulados o destinatarios de prueba autorizados.
- No inferir proveedor SMTP, remitente, dominio, despliegue ni cuenta de Meta: siguen pendientes.
