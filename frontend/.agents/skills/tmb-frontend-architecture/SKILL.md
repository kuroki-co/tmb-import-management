---
name: tmb-frontend-architecture
description: Organizar y ampliar el frontend de TMB con Next.js, React y TypeScript. Usar al crear funcionalidades, refactorizar responsabilidades, decidir límites servidor/cliente o estructurar acceso y contratos de la API NestJS; no para cambios exclusivamente visuales.
---

# Arquitectura del frontend de TMB

Trabajar sobre `frontend/` con Next.js App Router, React, TypeScript, Tailwind CSS y pnpm. Consultar `package.json` para las versiones instaladas. NestJS es el backend independiente: posee persistencia, autorización y reglas del negocio.

Respetar `AGENTS.md`. Antes de escribir código específico de Next.js, leer la guía pertinente de `node_modules/next/dist/docs/` indicada por el repositorio y consultar Context7 para sintaxis, configuración o comportamiento de librerías.

Para contratos de API, el estándar acordado es OpenAPI generado por NestJS, tipos con `openapi-typescript` y consumo mediante `openapi-fetch`. Para formularios, usar React Hook Form con Zod y `@hookform/resolvers`. Son decisiones de stack; consultar `package.json` para comprobar qué dependencias ya están instaladas antes de implementar.

## Prioridades

- **Single Responsibility:** dar a cada componente, hook y función una responsabilidad coherente. Separar presentación, transporte HTTP y transformación de datos cuando mezclarlos dificulte modificar o probar el código. No dividir una operación sencilla en archivos diminutos por cumplir una regla mecánica.
- **Open/Closed:** extender mediante composición, propiedades tipadas y variantes explícitas cuando existan necesidades reales. Evitar componentes llenos de condiciones por pantalla, sin anticipar plugins o extensiones hipotéticas.
- Aplicar otros principios SOLID solo cuando aporten valor; no imponer clases, interfaces ni capas por defecto.

## Flujo y referencias

1. Inspeccionar la funcionalidad afectada y las convenciones existentes antes de proponer una estructura.
2. Leer solo la referencia correspondiente al trabajo:
   - [Estructura y dependencias](references/project-structure.md): ubicación de código, nuevas funcionalidades o extracción de código compartido.
   - [Servidor, cliente y estado](references/server-client-state.md): componentes interactivos, carga de datos o propiedad del estado.
   - [Límites y contratos de API](references/api-boundaries.md): llamadas a NestJS, solicitudes, respuestas, errores o transformación de datos.
3. Implementar la solución más pequeña que mantenga los límites definidos. No crear carpetas vacías ni infraestructura antes de necesitarla.
4. Ejecutar las comprobaciones pertinentes y verificar el comportamiento afectado. Priorizar pruebas de contratos, transformaciones y flujos críticos cuando el cambio lo justifique; no probar detalles de organización por sí mismos.

Las reglas visuales pertenecen a la skill vecina `tmb-ui-design`. No duplicarlas aquí ni cargarla para tareas que no cambian la interfaz. No agregar librerías, proveedores de autenticación ni formatos de API como si ya fueran decisiones aprobadas.
