import type { Database } from "./database.types";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

// One client per request. The caller must write cookies/headers to its response.
// Wire session refresh and authorization before using this in private routes.
export function createClient(cookies: CookieMethodsServer) {
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient<Database>(url, publishableKey, { cookies });
}
