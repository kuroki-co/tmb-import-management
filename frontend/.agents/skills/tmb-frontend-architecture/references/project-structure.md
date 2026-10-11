# Estructura y dependencias

Todas las rutas de esta referencia son relativas a `frontend/`.

## Ubicación del código

```text
src/
├── app/                 # Rutas, layouts y composición de páginas
├── features/            # Funcionalidades y casos de uso
│   └── <feature>/
│       ├── components/  # UI específica de la funcionalidad
│       ├── api.ts       # Solicitudes de esta funcionalidad
│       ├── types.ts     # Tipos propios y contratos, si hacen falta
│       └── mappers.ts   # Transformaciones, solo cuando se necesiten
├── components/
│   └── ui/              # Primitivas visuales compartidas
└── lib/
    └── api/             # Transporte HTTP y errores comunes
```

Esta estructura es una guía, no una plantilla obligatoria. Mantener las convenciones del código existente cuando sean coherentes. Añadir hooks, esquemas o subcarpetas solo si una funcionalidad los necesita. Dividir `api.ts` por casos de uso cuando su tamaño o responsabilidades lo justifiquen.

- Mantener en `app/` las responsabilidades de ruta y composición. Llevar lógica específica reutilizable o compleja a la funcionalidad propietaria; no añadir capas a una página trivial.
- Ubicar componentes exclusivos junto a su funcionalidad y primitivas compartidas en `components/ui/`.
- Mantener utilidades de infraestructura en `lib/`; no convertirlo en depósito de reglas de negocio o helpers sin relación.
- Usar el alias existente `@/*` para importaciones desde `src/` cuando aporte claridad.

## Dirección de dependencias

Las rutas pueden componer funcionalidades y componentes compartidos. Las funcionalidades pueden usar infraestructura común. Los componentes visuales compartidos no deben importar funcionalidades concretas ni conocer endpoints.

- Evitar ciclos y acceso a detalles internos de otras funcionalidades. Exponer funciones o componentes concretos cuando haya un consumidor real; no crear archivos de exportación masiva por rutina.
- Extraer código compartido por reutilización real o una responsabilidad común demostrada, no por parecido superficial.
- Preferir composición y contratos pequeños para extender un componente. Si dos variantes requieren responsabilidades diferentes, considerar componentes separados antes de añadir múltiples booleanos.
- No importar código interno de `backend/` desde el frontend. Si se acuerdan contratos compartidos o generación de tipos, diseñar ese mecanismo explícitamente sin arrastrar dependencias de ejecución del backend.
