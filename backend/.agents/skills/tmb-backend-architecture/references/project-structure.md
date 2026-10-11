# Estructura

```text
src/
├── main.ts
├── app.module.ts
├── modules/
│   └── <feature>/
│       ├── <feature>.module.ts
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       └── dto/
└── common/
```

Es una guía: cada funcionalidad incorpora solo las piezas necesarias. Un módulo interno puede no tener controller.

- Controllers: transporte HTTP y delegación; evitar reglas de negocio y consultas.
- Services: casos de uso y reglas de negocio. Separarlos por responsabilidad cuando crezcan, no por cantidad arbitraria de líneas.
- DTOs: entradas y salidas explícitas, no modelos de base de datos expuestos directamente.
- Acceso a datos: puede comenzar en el service; separarlo si aporta claridad, reutilización o complejidad de consultas.
- Exportar solo providers necesarios. Evitar ciclos, imports de detalles internos de otros módulos y `common/` como depósito de utilidades.
- Mantener integraciones de correo, WhatsApp y PDFs separadas de la decisión de negocio que las utiliza. Extender mediante providers cuando exista una necesidad real, sin frameworks de plugins anticipados.
