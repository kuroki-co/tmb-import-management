import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { z } from "npm:zod@4.6.5";
import {
  type Fri,
  inputSchema,
  recordDataSchema,
} from "../_shared/validation.ts";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    data: z.unknown(),
    receiptToken: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  z.object({ action: z.literal("list") }).strict(),
  z.object({ action: z.literal("profile") }).strict(),
  z.object({ action: z.literal("review"), id: z.uuid() }).strict(),
  z.object({
    action: z.literal("receipt"),
    id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  z.object({
    action: z.literal("pdf"),
    id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  }).strict(),
]);
class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
const secret = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
const map = (
  row: {
    id: string;
    created_at: string;
    code: string;
    status: string;
    data: unknown;
  },
): Fri => ({
  id: row.id,
  createdAt: row.created_at,
  code: row.code,
  status: row.status,
  data: recordDataSchema.parse(row.data),
});

export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const allowed = (Deno.env.get("FRONTEND_ORIGINS") ||
    "http://localhost:3000,http://127.0.0.1:3000").split(",").map((s) =>
      s.trim()
    );
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  if (origin && !allowed.includes(origin)) {
    return json({ message: "Origen no permitido" }, 403);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return json({ message: "Método no permitido" }, 405);
  }
  try {
    if (Number(req.headers.get("content-length") || 0) > 32768) {
      throw new HttpError(413, "Solicitud demasiado grande");
    }
    const reader = req.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) {
          await reader.cancel();
          throw new HttpError(413, "Solicitud demasiado grande");
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new HttpError(400, "Solicitud inválida");
    }
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, "Solicitud inválida");
    const body = parsed.data;
    const url = secret("SUPABASE_URL");
    const admin = createClient(url, secret("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const limit = async (key: string, max: number, seconds: number) => {
      const { data, error } = await admin.rpc("tmb_consume_limit", {
        p_key: key,
        p_max: max,
        p_seconds: seconds,
      });
      if (error) throw error;
      if (!data) {
        throw new HttpError(
          429,
          "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
        );
      }
    };
    // The platform supplies the forwarding address; document/mobile quotas also apply to creation.
    const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const ip = await hash(address);
    if (body.action === "create") {
      const validated = inputSchema.safeParse(body.data);
      if (!validated.success) {
        throw new HttpError(
          400,
          validated.error.issues.map((i) => i.message).join(". "),
        );
      }
      if (Deno.env.get("FRI_ACCEPT_SUBMISSIONS") !== "true") {
        throw new HttpError(
          503,
          "Estamos preparando el registro de solicitudes. Inténtalo más tarde.",
        );
      }
      await limit(`create:ip:${ip}`, 10, 3600);
      await limit(
        `create:document:${await hash(
          validated.data.documentType + validated.data.documentNumber,
        )}`,
        5,
        86400,
      );
      await limit(
        `create:mobile:${await hash(validated.data.mobile)}`,
        5,
        86400,
      );
      await limit("create:global", 500, 3600);
      const { data, error } = await admin.rpc("tmb_create_fri", {
        p_data: validated.data,
        p_token: body.receiptToken,
      });
      if (error) throw error;
      return json({ id: data, receiptToken: body.receiptToken }, 201);
    }
    let record: Fri | undefined;
    const token = "token" in body ? body.token : undefined;
    if (body.action === "receipt" || (body.action === "pdf" && token)) {
      await limit(`receipt:${ip}`, 60, 60);
      const { data, error } = await admin.rpc("tmb_read_receipt", {
        p_id: body.id,
        p_token: token,
      });
      if (error) throw error;
      if (!data?.[0]) throw new HttpError(404, "Solicitud no encontrada");
      record = map(data[0]);
      if (body.action === "receipt") return json(record);
    } else {
      const auth = req.headers.get("authorization");
      if (!auth?.startsWith("Bearer ")) {
        throw new HttpError(401, "Inicia sesión para continuar");
      }
      const jwt = auth.slice(7);
      const { data: verified, error: authError } = await admin.auth.getUser(
        jwt,
      );
      if (authError || !verified.user) {
        throw new HttpError(401, "La sesión expiró. Inicia sesión nuevamente");
      }
      const user = createClient(url, secret("SUPABASE_ANON_KEY"), {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: seller, error: sellerError } = await user.from(
        "tmb_sellers",
      ).select("id,name,active").eq("id", verified.user.id).eq("active", true)
        .maybeSingle();
      if (sellerError) throw sellerError;
      if (!seller) {
        throw new HttpError(403, "Tu cuenta no tiene acceso de vendedor");
      }
      if (body.action === "profile") {
        return json({
          id: seller.id,
          name: seller.name,
          email: verified.user.email || "",
        });
      }
      await limit(`seller:${seller.id}`, 120, 60);
      if (body.action === "list") {
        const { data, error } = await user.from("tmb_fri_requests").select(
          "id,created_at,code,status,data",
        ).order("created_at", { ascending: false }).order("id", {
          ascending: false,
        }).limit(500);
        if (error) throw error;
        return json((data || []).map(map));
      }
      if (body.action === "review") {
        const { data, error } = await user.rpc("tmb_review_fri", {
          p_id: body.id,
        });
        if (error) throw error;
        if (!data?.[0]) throw new HttpError(404, "Solicitud no encontrada");
        return json(map(data[0]));
      }
      if (body.action === "pdf") {
        const { data, error } = await user.from("tmb_fri_requests").select(
          "id,created_at,code,status,data",
        ).eq("id", body.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new HttpError(404, "Solicitud no encontrada");
        record = map(data);
      }
    }
    if (!record) throw new HttpError(400, "Operación inválida");
    const { PdfService } = await import("../_shared/pdf.ts");
    const pdf = await new PdfService().generate(record);
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FRI-${record.code}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ message: error.message }, error.status);
    }
    // Do not log bodies, bearer tokens or customer records.
    console.error(
      "FRI operation failed",
      error instanceof Error ? error.name : "DatabaseError",
    );
    return json({
      message: "No se pudo completar la operación. Inténtalo nuevamente.",
    }, 500);
  }
}
if (import.meta.main) Deno.serve(handler);
