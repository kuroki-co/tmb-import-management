# Componentes, variantes y composición

- Buscar implementaciones existentes antes de crear botones, campos, tarjetas, modales o tablas.
- Extraer un componente cuando haya reutilización real o encapsule una responsabilidad e interacción claras. No extraer por una repetición trivial aislada.
- Seguir la ubicación existente. Si aún no hay convención, usar `src/components/ui/` para primitivas compartidas y mantener componentes específicos junto a su funcionalidad, respecto de `frontend/`.
- Definir variantes explícitas y tipadas, como `primary`, `secondary` y `danger`. Agregar tamaños solo cuando haya una necesidad real.
- Compartir clases base y mapear variantes a clases completas, sin construir nombres de utilidades con fragmentos dinámicos.
- Preferir composición para tarjetas, encabezados y formularios antes de acumular booleanos con combinaciones ambiguas.
- Preservar atributos HTML, etiquetas, foco y eventos. Usar botones para acciones y enlaces para navegación.
- Reutilizar herramientas de combinación de clases o variantes ya instaladas cuando ayuden; no añadir dependencias para un caso simple.
- Evitar componentes universales que mezclen presentación, solicitudes a NestJS y reglas del negocio.

La reutilización debe permitir cambiar un patrón visual en un lugar sin afectar pantallas no relacionadas.
