# Pantallas, estados y accesibilidad

## Distribución y responsive

- Mantener consistentes ancho de contenido, márgenes, títulos y ubicación de acciones entre pantallas relacionadas.
- Distinguir acciones principales, secundarias y destructivas mediante jerarquía visual y texto claro.
- Reutilizar patrones existentes de búsqueda, filtros, tablas y paginación; no añadir controles innecesarios.
- Aplicar estilos base para móvil y ajustar con `md:` y `lg:` según el contenido.
- Mantener formularios y acciones accesibles en pantallas pequeñas. En tablas, elegir desplazamiento horizontal o una presentación alternativa conservando información y acciones necesarias.

## Estados e interacción

- Diseñar carga, vacío, error, éxito y deshabilitado cuando apliquen al flujo.
- Diferenciar una lista vacía de una búsqueda sin resultados y de un fallo al cargar.
- Dar feedback durante acciones y evitar envíos duplicados desde la interfaz cuando corresponda.
- Mantener coherentes `hover:`, `focus-visible:` y estados de interacción. No depender únicamente de hover o color.
- Usar transiciones y transforms para aclarar interacciones, evitando movimiento distractor. Respetar `prefers-reduced-motion` con variantes de Tailwind o CSS equivalente.

## Verificación

- Usar etiquetas en formularios, nombres accesibles en botones con iconos y foco visible.
- Mantener navegación por teclado y contraste legible. En modales, comprobar foco, cierre y retorno al disparador.
- Revisar en navegador los estados que cambian y los tamaños relevantes; comprobar desbordamientos, contenido cortado y acciones ocultas.
- Ejecutar lint y comprobaciones apropiadas al cambio. No añadir pruebas que solo repliquen clases CSS.
