import { createClient } from "./browser";
import { getSupabaseConfig } from "./config";
export const usesSupabase = () =>
  process.env.NEXT_PUBLIC_BACKEND_PROVIDER === "supabase";
export class SupabaseApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function callFriFunction(
  body: Record<string, unknown>,
  authenticated = false,
  pdf = false,
): Promise<unknown> {
  const { url, publishableKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: publishableKey,
    "Content-Type": "application/json",
  };
  if (authenticated) {
    const { data, error } = await createClient().auth.getSession();
    if (error || !data.session)
      throw new SupabaseApiError(401, "Inicia sesión para continuar");
    // Only transports the token. Edge verifies it with Auth and checks active seller permissions.
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(`${url}/functions/v1/fri-api`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new SupabaseApiError(
      response.status,
      typeof error?.message === "string"
        ? error.message
        : "No se pudo completar la operación. Inténtalo nuevamente.",
    );
  }
  if (pdf) {
    if (!response.headers.get("content-type")?.includes("application/pdf"))
      throw new Error("No se pudo descargar el PDF");
    return response.blob();
  }
  return response.json();
}
