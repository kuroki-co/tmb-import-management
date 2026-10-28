import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta configurar ${name} en Supabase`);
  return value;
};

function base64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
async function encryptionKey() {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(required("GOOGLE_TOKEN_ENCRYPTION_KEY")),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptRefreshToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(token),
  );
  return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}
async function decryptRefreshToken(value: string) {
  const [iv, ciphertext] = value.split(".");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await encryptionKey(),
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
export async function calendarAccessToken(admin: SupabaseClient) {
  const { data, error } = await admin.from("tmb_calendar_connections")
    .select("encrypted_refresh_token").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Google Calendar todavía no está conectado");
  const refreshToken = await decryptRefreshToken(data.encrypted_refresh_token);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== "string") {
    throw new Error("No pudimos renovar el acceso a Google Calendar. Reconecta la cuenta desde Agenda.");
  }
  return result.access_token as string;
}
export async function googleRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || "Google Calendar no pudo completar la operación");
  return body as T;
}
export async function calendarConnected(admin: SupabaseClient) {
  const { data, error } = await admin.from("tmb_calendar_connections")
    .select("google_email,connected_at").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

