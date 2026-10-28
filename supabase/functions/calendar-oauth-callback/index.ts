import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { encryptRefreshToken } from "../_shared/google-calendar.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const hash = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  (byte) => byte.toString(16).padStart(2, "0"),
).join("");

Deno.serve(async (request) => {
  const frontend = Deno.env.get("FRONTEND_URL") || "http://127.0.0.1:3000";
  const destination = new URL("/panel/agenda", frontend);
  try {
    const url = new URL(request.url);
    const providerError = url.searchParams.get("error");
    if (providerError) throw new Error("Google canceló la conexión de Calendar");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) throw new Error("Respuesta OAuth incompleta");

    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const stateHash = await hash(state);
    const { data: oauthState, error: stateError } = await admin.from("tmb_calendar_oauth_states")
      .select("seller_id,expires_at").eq("state_hash", stateHash).maybeSingle();
    if (stateError) throw stateError;
    if (!oauthState || new Date(oauthState.expires_at).getTime() < Date.now()) {
      throw new Error("La conexión expiró. Vuelve a intentarlo desde Agenda");
    }
    await admin.from("tmb_calendar_oauth_states").delete().eq("state_hash", stateHash);

    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || `${env("SUPABASE_URL")}/functions/v1/calendar-oauth-callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env("GOOGLE_CLIENT_ID"),
        client_secret: env("GOOGLE_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.refresh_token !== "string") {
      throw new Error("Google no entregó acceso persistente. Vuelve a conectar la cuenta y acepta los permisos solicitados");
    }
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || typeof profile.email !== "string") throw new Error("No pudimos identificar la cuenta de Google");
    const { error: saveError } = await admin.from("tmb_calendar_connections").upsert({
      id: 1,
      google_email: profile.email,
      encrypted_refresh_token: await encryptRefreshToken(token.refresh_token),
      connected_at: new Date().toISOString(),
      connected_by: oauthState.seller_id,
    }, { onConflict: "id" });
    if (saveError) throw saveError;
    destination.searchParams.set("calendar", "connected");
  } catch (error) {
    destination.searchParams.set("calendar_error", error instanceof Error ? error.message : "No se pudo conectar Google Calendar");
  }
  return Response.redirect(destination.toString(), 302);
});
