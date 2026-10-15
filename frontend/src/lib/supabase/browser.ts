"use client";
import type { Database } from "./database.types";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

// Prepared for migration; current screens still use the NestJS API.
export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
