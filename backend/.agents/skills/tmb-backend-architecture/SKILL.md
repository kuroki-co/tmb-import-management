---
name: tmb-backend-architecture
description: Crear y ampliar el backend NestJS de TMB con módulos por funcionalidad, contratos OpenAPI, persistencia, autenticación, notificaciones, PDFs y seguimientos programados. Usar para implementar o revisar comportamiento del backend; no para diseño visual del frontend.
---

# Arquitectura del backend de TMB

Todas las rutas de código son relativas a `backend/`. Respetar las instrucciones del repositorio. Consultar Context7 para sintaxis y configuración actuales de las librerías utilizadas.

Transición acordada: el backend objetivo es Supabase y sus reglas viven en `../supabase/.agents/skills/tmb-supabase/SKILL.md`. Esta skill aplica al NestJS legado conservado como respaldo; Supabase ya está activo y el historial fue importado. Consultar `../supabase/README.md` antes de introducir nuevas integraciones o retirar funcionalidades. Para las notificaciones nuevas el proveedor acordado es Resend por HTTP; las referencias históricas a Nodemailer/SMTP no obligan a incorporarlo.

## Stack acordado

- NestJS, TypeScript y pnpm.
- PostgreSQL y Sequelize integrado con NestJS.
- `class-validator` y `class-transformer` para DTOs.
- `@nestjs/swagger` para OpenAPI y contratos consumidos por el frontend.
- `@nestjs/jwt` para tokens de acceso y renovación; Argon2id para contraseñas.
- `@nestjs/config` para configuración.
- Nodemailer para correo SMTP; proveedor pendiente.
- WhatsApp Business Platform, Cloud API de Meta; cuenta y configuración pendientes.
- PDFKit para PDFs programáticos. Evaluar una alternativa si el diseño requiere HTML complejo.
- `@nestjs/schedule` y PostgreSQL para cronjobs y seguimientos persistentes.
- Vitest y Supertest para pruebas, según la configuración existente.

El stack acordado no implica que las dependencias estén instaladas. Revisar `package.json` antes de implementar. BullMQ y Redis no son requisitos actuales; incorporarlos solo si la necesidad de colas persistentes lo justifica.

## Prioridades

Priorizar Single Responsibility y Open/Closed: responsabilidades coherentes y extensión mediante composición e inyección cuando haya variantes reales. Mantener el flujo Controller → Service → acceso a datos, sin imponer capas o repositorios genéricos. No crear carpetas vacías ni abstracciones anticipadas.

## Referencias por tarea

Leer únicamente las necesarias:

- [Estructura](references/project-structure.md): módulos, responsabilidades y dependencias.
- [Datos](references/data-access.md): Sequelize, migraciones y transacciones.
- [Seguridad](references/auth-security.md): JWT, contraseñas y autorización.
- [Validación y errores](references/validation-errors.md): DTOs y respuestas de error.
- [OpenAPI](references/api-openapi.md): documentación y exportación de contratos.
- [Configuración](references/configuration.md): variables, secretos y arranque.
- [Notificaciones](references/notifications.md): correo y WhatsApp.
- [PDFs](references/pdf-generation.md): generación y entrega de documentos.
- [Tareas programadas](references/scheduled-jobs.md): recordatorios, concurrencia y reintentos.

Verificar comportamiento y contratos afectados con pruebas pertinentes. No enviar mensajes a clientes reales ni desplegar integraciones externas como parte de una prueba sin autorización explícita para esos envíos.
