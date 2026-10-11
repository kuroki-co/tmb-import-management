# Tokens y Tailwind CSS 4

Consultar primero `src/app/globals.css`, relativo a `frontend/`. Ampliar su sistema de tokens cuando el diseño lo requiera.

- Centralizar decisiones compartidas mediante `@theme`. Usar `@theme inline` cuando el token se resuelva mediante otra variable CSS, como los tokens actuales.
- Preferir nombres según función: `background`, `foreground`, `surface`, `primary`, `muted`, `border`, `danger`. Crear solo los necesarios.
- Reutilizar las escalas de espaciado, radios y tamaños de Tailwind antes de añadir valores nuevos.
- Usar valores arbitrarios para necesidades puntuales justificadas. Convertirlos en tokens cuando representen decisiones de diseño repetidas.
- Mantener coherentes los modos claro/oscuro existentes; no introducir otros sin una necesidad del trabajo.
- Usar utilidades junto al marcado para composición y estilos locales. Reservar CSS global para tokens, estilos base y reglas realmente globales.
- Centralizar patrones visuales repetidos en componentes React. No usar `@apply` para convertir sistemáticamente todas las utilidades en clases CSS; reservarlo para integraciones o casos donde aporte claridad.
- Escribir clases completas: evitar `bg-${color}-600` y mapear las variantes a cadenas estáticas detectables por Tailwind.

Ejemplo ilustrativo, no una propuesta de marca para TMB:

```css
@theme {
  --color-primary: #2563eb;
}
```

Permite usar `bg-primary` y `text-primary`. Elegir el valor real según el diseño aprobado o la interfaz existente.
