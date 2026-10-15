import { z } from "zod";
import { api, errorMessage } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/browser";
import {
  callFriFunction,
  SupabaseApiError,
  usesSupabase,
} from "@/lib/supabase/functions";
const sellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type Seller = z.infer<typeof sellerSchema>;
export async function login(email: string, password: string) {
  if (usesSupabase()) {
    const client = createClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      throw new Error(
        "No se pudo iniciar sesión. Revisa tu correo y contraseña.",
      );
    try {
      return sellerSchema.parse(
        await callFriFunction({ action: "profile" }, true),
      );
    } catch (error) {
      await client.auth.signOut({ scope: "local" });
      throw error;
    }
  }
  const { data, error } = await api.POST("/auth/login", {
    body: { email, password },
  });
  if (!data || error) throw new Error(errorMessage(error));
  return data;
}
export async function currentSeller() {
  if (usesSupabase()) {
    try {
      return sellerSchema.parse(
        await callFriFunction({ action: "profile" }, true),
      );
    } catch (error) {
      if (
        error instanceof SupabaseApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await createClient().auth.signOut({ scope: "local" });
        return null;
      }
      throw error;
    }
  }
  const { data, error, response } = await api.GET("/auth/me");
  if (response.status === 401) return null;
  if (!data || error) throw new Error(errorMessage(error));
  return data;
}
export async function logout() {
  if (usesSupabase()) {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) throw new Error("No se pudo cerrar sesión");
    return;
  }
  const { error } = await api.POST("/auth/logout");
  if (error) throw new Error(errorMessage(error));
}
