# Edge Functions de TMB

`fri-api` implementa creación FRI, perfil de vendedor, listado, revisión, recibos y PDFs. Ver `../README.md` para el estado del despliegue y las comprobaciones.

También gestiona parámetros base de cotización, cálculo y guardado de cotizaciones. El acceso se valida con JWT y vendedor activo; los parámetros base se guardan separadamente de los ajustes y cálculos por solicitud.

`fri-api` sirve el catálogo público únicamente con filtros de publicación y permite a vendedores buscar/importar desde `hiluxperu.com`. El scraper restringe las URLs al mismo host, sigue páginas por lotes, conserva las etiquetas de precio originales y deja nuevos registros web en borrador. Ante error o HTML inesperado, informa el error y conserva la última extracción completa. Para continuar una extracción en curso, desplegar `fri-api`, configurar `VEHICLE_CATALOG_SYNC_SECRET` y programar el llamado cada cinco minutos según `../scripts/schedule-vehicle-catalog.sql`.

`verify_jwt=false` permite las acciones públicas. Las acciones privadas requieren JWT validado por Auth y vendedor activo, además de RLS. Los recibos usan tokens de 256 bits cuyo hash se guarda fuera del esquema público; nunca loguear tokens ni datos de clientes.

El envío público se habilita con `FRI_ACCEPT_SUBMISSIONS=true` después de importar el historial y el contador. `FRONTEND_ORIGINS` configura los orígenes autorizados. La función aplica límites persistentes por IP, documento, celular y global; revisar valores si el volumen de negocio los supera.

El PDF usa PDFKit en Deno con fuentes Carlito embebidas para el despliegue por API. Las fuentes tienen licencia OFL en `_shared/fonts-OFL.txt`. Se genera bajo demanda y requiere autorización; no se muestra dentro de la página.

Resend, Meta y Cron siguen pendientes de implementación/configuración. Sus variables de ejemplo no activan envíos.
