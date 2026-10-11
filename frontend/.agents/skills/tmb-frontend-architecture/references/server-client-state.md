# Servidor, cliente y estado

## Límites de ejecución

- Preferir Server Components para composición y lectura de datos cuando encajen con el flujo.
- Usar `"use client"` para componentes que necesitan estado interactivo, eventos o APIs del navegador. Mantener la frontera en el subárbol que lo necesita; no convertir todo un layout por un hijo interactivo.
- Pasar datos serializables al cruzar la frontera servidor/cliente; no pasar clientes HTTP, credenciales privadas o funciones ordinarias de servidor.
- Mantener secretos y utilidades exclusivas de servidor fuera de las importaciones transitivas del cliente.
- No crear Server Actions o Route Handlers como una segunda implementación del negocio de NestJS. Pueden adaptar una interacción o actuar como intermediarios cuando resuelvan una necesidad concreta de sesión, seguridad o integración.
- Elegir acceso directo a NestJS desde el navegador o acceso mediante Next.js según autenticación y despliegue. No añadir un proxy por costumbre ni asumir un mecanismo de sesión todavía no definido.

## Propiedad del estado

- Mantener estado local para controles, modales y cambios sin guardar.
- Usar parámetros de URL para búsqueda, filtros, orden y paginación cuando deban persistir al navegar o compartirse.
- Tratar los datos de NestJS como estado remoto. Evitar mantener copias redundantes que puedan divergir; actualizar o recargar los datos afectados después de una mutación.
- Incorporar contexto o estado global solo para una necesidad compartida real. No instalar Redux, Zustand o una librería de consultas automáticamente.
- Usar hooks para encapsular comportamiento de React coherente; una solicitud HTTP sin estado de React puede ser una función normal.
- En solicitudes dependientes de filtros o búsqueda, evitar que respuestas antiguas sobrescriban resultados recientes mediante cancelación o el mecanismo adecuado del cliente utilizado.

## Carga y caché

Decidir explícitamente frescura, caché y actualización según el dato. No asumir los valores predeterminados de otra versión de Next.js. Revisar la documentación instalada antes de configurar caché o revalidación.

No compartir respuestas privadas entre usuarios. La ocultación de elementos en la UI no sustituye la autorización del backend. Representar carga, error y resultado vacío sin confundirlos con datos válidos; delegar su apariencia a las reglas de diseño.
