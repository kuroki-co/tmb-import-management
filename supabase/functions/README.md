# Edge Functions de TMB

`fri-api` implementa creación FRI, perfil de vendedor, listado, revisión, recibos y PDFs. Ver `../README.md` para el estado del despliegue y las comprobaciones.

También gestiona parámetros base de cotización, cálculo y guardado de cotizaciones. El acceso se valida con JWT y vendedor activo; los parámetros base se guardan separadamente de los ajustes y cálculos por solicitud.

`fri-api` sirve el catálogo público únicamente con filtros de publicación y permite a vendedores buscar/importar desde `hiluxperu.com`. El scraper restringe las URLs al mismo host, sigue páginas por lotes, conserva las etiquetas de precio originales y deja nuevos registros web en borrador. Ante error o HTML inesperado, informa el error y conserva la última extracción completa. Para continuar una extracción en curso, desplegar `fri-api`, configurar `VEHICLE_CATALOG_SYNC_SECRET` y programar el llamado cada cinco minutos según `../scripts/schedule-vehicle-catalog.sql`.

`verify_jwt=false` permite las acciones públicas. Las acciones privadas requieren JWT validado por Auth y vendedor activo, además de RLS. Los recibos usan tokens de 256 bits cuyo hash se guarda fuera del esquema público; nunca loguear tokens ni datos de clientes.

El envío público se habilita con `FRI_ACCEPT_SUBMISSIONS=true` después de importar el historial y el contador. `FRONTEND_ORIGINS` configura los orígenes autorizados. La función aplica límites persistentes por IP, documento, celular y global; revisar valores si el volumen de negocio los supera.

Al recibir el FRI, si el vehículo elegido tiene un FOB numérico en USD y se seleccionó Automóvil o Camión, `fri-api` calcula y guarda la proforma con los parámetros vigentes, marca la solicitud como `Cotizado` y, si hay correo y Resend configurado, envía juntos el PDF del FRI y la proforma. El flete inicial referencial es USD 3,000 para automóvil y USD 9,000 para camión. Sin esos datos, conserva el flujo manual de la vendedora. La migración `20261103000100_automatic_quotations.sql` permite cotizaciones sin vendedor y registra el resultado del envío; aplicar la migración antes de desplegar la función.

El PDF usa PDFKit en Deno con fuentes Carlito embebidas para el despliegue por API. Las fuentes tienen licencia OFL en `_shared/fonts-OFL.txt`. Se genera bajo demanda y requiere autorización; no se muestra dentro de la página.

Resend tiene acciones privadas de estado y envío de prueba al vendedor autenticado en `fri-api`. Al registrar un FRI con correo opcional, envía una confirmación con el código y el PDF del FRI adjunto; si Resend falla, conserva la solicitud. La vendedora también puede enviar al cliente la proforma PDF de una cotización guardada. El remitente usa el dominio verificado de TMB; ver `../RESEND_SETUP.md`. Los recordatorios, Meta y Cron siguen pendientes.
