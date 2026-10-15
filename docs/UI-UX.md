# Revisión funcional de UI/UX

La revisión combina inspección del código y pruebas de interacción con React Testing Library en jsdom. No sustituye una revisión visual: el acceso del agente al navegador localhost está bloqueado por una preferencia guardada.

## Comportamientos comprobados del FRI

- Cliente solo ofrece Continuar. Los pasos siguientes permiten volver sin perder datos.
- Los datos inválidos bloquean el avance y los errores se relacionan con sus campos.
- Cambiar tipo de documento actualiza límites, etiquetas y campos condicionales.
- Un campo que deja de aplicar no debe bloquear el formulario.
- El borrador conserva datos parciales y el paso; el preview no toca ese borrador.
- Empezar de nuevo requiere confirmación y permite cancelar.
- Editar desde el resumen vuelve a confirmación; Enter no envía desde un paso intermedio.
- La declaración es necesaria antes de enviar.
- Durante el envío se bloquean edición y envíos repetidos.
- Si el envío falla, se conserva el borrador y se permite reintentar.
- Un fallo de sessionStorage después de registrar no se presenta como un fallo de envío: el recibo tiene respaldo temporal en memoria.
- El preview comunica éxito de validación como información y nunca registra solicitudes.

Las pruebas están en `frontend/src/features/fri/components/fri-form.test.tsx`. Ejecutar `pnpm --dir frontend test` junto con tipos, lint y build.

## Pendiente de comprobación en navegador real

- Anchos 320, 375, 768 y 1280 px: ausencia de desbordamientos y legibilidad.
- Teclado móvil: visibilidad del campo enfocado y de las acciones.
- Dialog nativo: Escape, confinamiento de foco y retorno al botón que lo abrió.
- Menú móvil: foco, Escape, navegación y visibilidad tras cambiar el ancho.
- PDF: descarga y preview en navegadores móviles.
- Lectura de etiquetas, errores y cambios de paso con lector de pantalla.

Las pruebas simulan métodos de dialog y desplazamiento ausentes en jsdom; no confirman esos comportamientos nativos ni el diseño renderizado.

## Ajustes de coherencia entre pantallas

La bandeja permite buscar por código, nombre, documento o vehículo, ignorando diferencias de tildes y mayúsculas. Los contadores funcionan como filtros y se identifican como tales; no cambian el estado. Se puede ordenar por fecha o presupuesto. En móvil se presentan tarjetas y en escritorio una tabla con código y enlace al detalle. Un fallo al actualizar conserva la última carga e informa que los datos no se renovaron. El login móvil prioriza los campos de acceso. Cada paso del FRI tiene una explicación breve, la navegación del panel indica la pantalla actual y los opcionales vacíos del detalle se agrupan en una nota. Equipamiento y observaciones usan ancho completo.
