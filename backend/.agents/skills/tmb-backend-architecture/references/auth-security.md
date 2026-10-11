# Autenticación y permisos

- Hashear contraseñas con Argon2id; no cifrarlas de forma reversible ni guardarlas en texto plano. Configurar parámetros según entorno y documentación actual.
- JWT firmados no ocultan su contenido. No incluir secretos o datos privados innecesarios.
- Verificar firma, algoritmo permitido, expiración y contexto de uso. Definir duraciones y almacenamiento de tokens antes de implementar; no asumir `localStorage`.
- Separar tokens de acceso y renovación. Implementar revocación y rotación coherentes, conservando verificadores seguros de tokens de renovación cuando se persistan.
- Usar guards para autenticación y autorización HTTP; comprobar también permisos sobre el recurso afectado. Una sesión válida no autoriza cualquier registro.
- Nunca devolver hashes o tokens internos en DTOs ordinarios ni registrarlos en logs.
- Acordar CORS, cookies y protección CSRF según el mecanismo de sesión elegido; no activar permisos indiscriminados.
