# Conectar Google Calendar

La aplicación usa una cuenta Google del equipo TMB como calendario principal. El navegador del cliente nunca recibe credenciales ni tokens de Google.

## Google Cloud

1. Crea o selecciona un proyecto de Google Cloud y habilita **Google Calendar API**.
2. Configura la pantalla de consentimiento OAuth. Mientras la aplicación siga en pruebas, añade la cuenta de TMB como usuario de prueba.
3. Crea un cliente OAuth de tipo **Aplicación web**.
4. En **URI de redirección autorizados**, añade exactamente:

   `https://zsnmycclgvkiyyzdmspc.supabase.co/functions/v1/calendar-oauth-callback`

5. Guarda el ID y el secreto del cliente OAuth fuera del repositorio.

## Secretos de Supabase

En el Dashboard del proyecto abre **Edge Functions → Secrets** y añade estas variables sin borrar las existentes:

- `GOOGLE_CLIENT_ID`: ID del cliente OAuth.
- `GOOGLE_CLIENT_SECRET`: secreto del cliente OAuth.
- `GOOGLE_TOKEN_ENCRYPTION_KEY`: clave aleatoria privada de 32 bytes o más. Puedes generar una localmente con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- `FRONTEND_URL`: `http://127.0.0.1:3000` para probar en local. En producción, usa el dominio publicado del frontend.

No guardes esos valores en archivos versionados ni los pegues en el chat. El callback OAuth se fija al URL de Supabase indicado arriba.

## Aplicar y desplegar

```powershell
pnpm dlx supabase@2.120.0 db push --project-ref zsnmycclgvkiyyzdmspc
pnpm dlx supabase@2.120.0 functions deploy fri-api --project-ref zsnmycclgvkiyyzdmspc
pnpm dlx supabase@2.120.0 functions deploy calendar-oauth-callback --project-ref zsnmycclgvkiyyzdmspc
```

Luego inicia sesión como vendedor, abre **Panel → Agenda → Conectar Google Calendar**, autoriza la cuenta de TMB y vuelve al formulario. Las citas se ofrecen de lunes a viernes, entre 9:00 a. m. y 5:00 p. m. (Perú), en bloques de 30 minutos.
