# Edge Functions de TMB

`fri-api` implementa creación FRI, perfil de vendedor, listado, revisión, recibos y PDFs. Ver `../README.md` para el estado del despliegue y las comprobaciones.

`verify_jwt=false` permite las acciones públicas. Las acciones privadas requieren JWT validado por Auth y vendedor activo, además de RLS. Los recibos usan tokens de 256 bits cuyo hash se guarda fuera del esquema público; nunca loguear tokens ni datos de clientes.

El envío público se habilita con `FRI_ACCEPT_SUBMISSIONS=true` después de importar el historial y el contador. `FRONTEND_ORIGINS` configura los orígenes autorizados. La función aplica límites persistentes por IP, documento, celular y global; revisar valores si el volumen de negocio los supera.

El PDF usa PDFKit en Deno con fuentes Carlito embebidas para el despliegue por API. Las fuentes tienen licencia OFL en `_shared/fonts-OFL.txt`. Se genera bajo demanda y requiere autorización; no se muestra dentro de la página.

Resend, Meta y Cron siguen pendientes de implementación/configuración. Sus variables de ejemplo no activan envíos.
