import { api, errorMessage } from "@/lib/api/client";
import type { FriFormValues } from "./schema";
import { callFriFunction, usesSupabase } from "@/lib/supabase/functions";
import { friRecordSchema, receiptSchema } from "./contracts";
export type { Fri } from "./contracts";
let pending: { body: string; token: string } | undefined;
const pendingKey = "tmb:fri:pending-submit:v1";
async function pendingToken(body: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(body)),
  );
  const fingerprint = Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  if (!pending) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
      if (
        typeof saved?.body === "string" &&
        /^[a-f0-9]{64}$/.test(saved?.token)
      )
        pending = saved;
    } catch {}
  }
  if (pending?.body !== fingerprint)
    pending = {
      body: fingerprint,
      token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join(""),
    };
  try {
    sessionStorage.setItem(pendingKey, JSON.stringify(pending));
  } catch {}
  return pending.token;
}
export async function submitFri(values: FriFormValues) {
  const { alternatives, ...rest } = values;
  const body = {
    ...rest,
    alternatives: alternatives === "Sí",
    declaration: true as const,
    email: values.email || undefined,
    representative:
      values.documentType === "RUC" && values.documentNumber.startsWith("20")
        ? values.representative
        : undefined,
    issuingCountry:
      values.documentType === "Pasaporte" ? values.issuingCountry : undefined,
    autonomy: values.fuel === "Eléctrico" ? values.autonomy : undefined,
  };
  if (usesSupabase()) {
    const receipt = receiptSchema.parse(
      await callFriFunction({
        action: "create",
        data: body,
        receiptToken: await pendingToken(body),
      }),
    );
    pending = undefined;
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {}
    return receipt;
  }
  const { data, error } = await api.POST("/fri", { body });
  if (error || !data) throw new Error(errorMessage(error));
  return data;
}
export async function listFri() {
  if (usesSupabase())
    return friRecordSchema
      .array()
      .parse(await callFriFunction({ action: "list" }, true));
  const { data, error } = await api.GET("/fri");
  if (error || !data) throw new Error(errorMessage(error));
  return friRecordSchema.array().parse(data);
}
export async function loadFri(id: string, token?: string) {
  if (usesSupabase())
    return friRecordSchema.parse(
      await callFriFunction(
        token ? { action: "receipt", id, token } : { action: "review", id },
        !token,
      ),
    );
  const result = token
    ? await api.GET("/fri/receipt/{id}", {
        params: { path: { id }, query: { token } },
      })
    : await api.POST("/fri/{id}/review", { params: { path: { id } } });
  if (!result.data || result.error) throw new Error(errorMessage(result.error));
  return friRecordSchema.parse(result.data);
}
export async function downloadFri(id: string, token?: string): Promise<Blob> {
  if (usesSupabase()) {
    const result = await callFriFunction(
      { action: "pdf", id, ...(token ? { token } : {}) },
      !token,
      true,
    );
    if (!(result instanceof Blob))
      throw new Error("No se pudo descargar el PDF");
    return result;
  }
  const result = token
    ? await api.GET("/fri/receipt/{id}/pdf", {
        params: { path: { id }, query: { token } },
        parseAs: "blob",
      })
    : await api.GET("/fri/{id}/pdf", {
        params: { path: { id } },
        parseAs: "blob",
      });
  if (!result.data || !result.response.ok)
    throw new Error(
      "No se pudo generar el PDF. Tu solicitud ya está registrada; puedes reintentar.",
    );
  return result.data;
}
