# Conectar Resend

La integración usa Resend desde `fri-api`; la clave nunca llega al navegador. El panel ofrece una comprobación de configuración y un envío manual de prueba al correo de la sesión del vendedor. El FRI también acepta un correo opcional y manda un acuse con el código de solicitud. Los recordatorios no están activados.

## 1. Modo de prueba

El dominio `tmbimporta.com` está verificado en Resend y habilitado para enviar. Supabase usa el remitente `TMB Importaciones <notificaciones@tmbimporta.com>`, así que puedes probar con tu propio correo completando el FRI.

La cuenta Free de Resend permite hasta 3.000 correos al mes y 100 al día. Además, el panel TMB limita el botón de prueba a tres envíos por vendedor cada hora.

Para revisar o cambiar el remitente, actualiza `RESEND_FROM_EMAIL` en los secretos de Supabase y usa una dirección del dominio verificado. Consulta [verificar un dominio](https://resend.com/docs/add-a-domain).

## 2. Guardar secretos en Supabase

En el Dashboard del proyecto TMB, abre **Edge Functions → Secrets** y agrega estas dos variables. Añádelas a los secretos existentes; no reemplaces ni borres los demás:

- `RESEND_API_KEY`: la API key creada en Resend.
- `RESEND_FROM_EMAIL`: `TMB Importaciones <notificaciones@tmbimporta.com>`.

No pegues ni guardes la API key en el repositorio, `.env.example`, el navegador o el chat.

## 3. Verificar

Inicia sesión en el panel y abre **Correo y notificaciones**. **Enviar correo de prueba** manda un mensaje simple al correo de la cuenta del vendedor que inició sesión; la función limita estas pruebas a tres por vendedor cada hora. Para probar la confirmación del cliente, llena el FRI y escribe tu dirección en **Correo**.

Si Resend no está disponible, el FRI igual se guarda y la pantalla de éxito indica que no se pudo mandar la confirmación. Los recordatorios requieren definir por separado la cadencia, el consentimiento y las condiciones para detener los mensajes.
