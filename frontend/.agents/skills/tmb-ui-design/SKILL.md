---
name: tmb-ui-design
description: Crear o modificar interfaces de TMB con Tailwind CSS, tokens y componentes React reutilizables. Usar para diseño de pantallas, variantes, estados visuales, responsive y accesibilidad; no para lógica de negocio o implementación de la API.
---

# Diseño de interfaz de TMB

Aplicar esta skill al frontend de TMB con React, TypeScript y Tailwind CSS 4. Respetar las instrucciones del repositorio y consultar documentación actual con Context7 para sintaxis o configuración de librerías.

## Flujo

1. Revisar la pantalla afectada, `src/app/globals.css` y los componentes existentes, tomando las rutas respecto de `frontend/`.
2. Leer únicamente las referencias necesarias:
   - [Tokens y Tailwind](references/tokens-tailwind.md): colores, fuentes, estilos globales o utilidades nuevas.
   - [Componentes y variantes](references/components.md): elementos repetidos, composición o variantes visuales.
   - [Pantallas y estados](references/screens.md): distribución, responsive, tablas, estados o accesibilidad.
3. Implementar el cambio reutilizando las decisiones visuales existentes. Si falta una decisión de marca, seguir el contexto de la interfaz sin presentarla como identidad aprobada.
4. Verificar los tamaños y estados afectados en navegador, y ejecutar las comprobaciones de frontend pertinentes. Informar cualquier verificación que no se haya podido realizar.

## Límites

- Los tokens y componentes viven en el código; esta skill guía su uso.
- Mantener lógica de negocio y persistencia fuera de los componentes de presentación.
- No instalar librerías de componentes, variantes o animaciones solo por activar esta skill.
- No crear una abstracción por cada combinación de clases ni leer todas las referencias por defecto.
- No trasladar identidad visual ni reglas de otros productos a TMB.
