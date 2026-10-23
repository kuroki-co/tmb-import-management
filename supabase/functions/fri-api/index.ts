import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { z } from "npm:zod@4.6.5";
import {
  type Fri,
  inputSchema,
  recordDataSchema,
} from "../_shared/validation.ts";
import {
  calculateQuotation,
  defaultQuotationSettings,
  quotationInputSchema,
  quotationSettingsSchema,
} from "../_shared/quotation.ts";
import {
  getCatalogSyncStatus,
  runCatalogSyncBatch,
} from "../_shared/vehicle-catalog.ts";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    data: z.unknown(),
    receiptToken: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  z.object({ action: z.literal("list") }).strict(),
  z.object({ action: z.literal("profile") }).strict(),
  z.object({
    action: z.literal("catalog-list"),
    query: z.string().max(60).optional(),
  }).strict(),
  z.object({ action: z.literal("catalog-get"), id: z.uuid() }).strict(),
  z.object({
    action: z.literal("catalog-admin-list"),
    query: z.string().max(60).optional(),
    source: z.enum(["all", "supplier_excel", "tmb_web"]).optional(),
  }).strict(),
  z.object({
    action: z.literal("catalog-publish"),
    id: z.uuid(),
    published: z.boolean(),
  }).strict(),
  z.object({ action: z.literal("catalog-sync-status") }).strict(),
  z.object({ action: z.literal("catalog-sync") }).strict(),
  z.object({ action: z.literal("quotation-settings-get") }).strict(),
  z.object({
    action: z.literal("quotation-settings-update"),
    values: z.unknown(),
  }).strict(),
  z.object({ action: z.literal("quotation-get"), id: z.uuid() }).strict(),
  z.object({
    action: z.literal("quotation-receipt"),
    id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  z.object({
    action: z.literal("quotation-pdf"),
    id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  z.object({
    action: z.literal("quotation-save"),
    id: z.uuid(),
    input: z.unknown(),
  }).strict(),
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
      "authorization, apikey, content-type, x-client-info, x-catalog-sync-secret",
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
    // Hash the forwarded address once; public catalog reads and FRI submissions share rate-limit identity.
    const address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const ip = await hash(address);
    if (body.action === "catalog-list") {
      await limit(`catalog:public:${ip}`, 60, 60);
      const search = (body.query || "").replace(/[^\p{L}\p{N}\s&./-]/gu, " ").trim();
      let query = admin.from("tmb_vehicle_catalog").select(
        "id,source_type,brand,model,variant,year,vehicle_type,fuel,transmission,engine,drive_type,color,price,currency,price_label,image_url,source_url,source_reference,updated_at",
      ).eq("is_active", true).eq("is_published", true)
        .order("brand", { ascending: true }).order("model", { ascending: true })
        .limit(50);
      if (search) {
        const term = `%${search.slice(0, 50)}%`;
        query = query.or(`brand.ilike.${term},model.ilike.${term},variant.ilike.${term}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json(data || []);
    }
    if (body.action === "catalog-get") {
      await limit(`catalog:public:${ip}`, 60, 60);
      const { data, error } = await admin.from("tmb_vehicle_catalog").select(
        "id,source_type,brand,model,variant,year,vehicle_type,fuel,transmission,engine,drive_type,color,price,currency,price_label,image_url,source_url,source_reference,updated_at",
      ).eq("id", body.id).eq("is_active", true).eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return json(data || null);
    }
    if (body.action === "catalog-sync" &&
      Deno.env.get("VEHICLE_CATALOG_SYNC_SECRET") &&
      req.headers.get("x-catalog-sync-secret") ===
        Deno.env.get("VEHICLE_CATALOG_SYNC_SECRET")) {
      return json(await runCatalogSyncBatch(admin));
    }
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
      let requestData: Record<string, unknown> = validated.data;
      if (validated.data.catalogVehicleId) {
        const { data: catalogVehicle, error: catalogError } = await admin
          .from("tmb_vehicle_catalog")
          .select("id,source_type,price,currency,price_label,source_url,updated_at")
          .eq("id", validated.data.catalogVehicleId)
          .eq("is_active", true)
          .eq("is_published", true)
          .maybeSingle();
        if (catalogError) throw catalogError;
        if (!catalogVehicle) {
          throw new HttpError(400, "El vehículo elegido ya no está disponible en el catálogo. Búscalo nuevamente o completa los datos manualmente.");
        }
        requestData = {
          ...validated.data,
          catalogReference: {
            id: catalogVehicle.id,
            sourceType: catalogVehicle.source_type,
            price: catalogVehicle.price === null
              ? null
              : Number(catalogVehicle.price),
            currency: catalogVehicle.currency,
            priceLabel: catalogVehicle.price_label,
            sourceUrl: catalogVehicle.source_url,
            updatedAt: catalogVehicle.updated_at,
          },
        };
      }
      const { data, error } = await admin.rpc("tmb_create_fri", {
        p_data: requestData,
        p_token: body.receiptToken,
      });
      if (error) throw error;
      return json({ id: data, receiptToken: body.receiptToken }, 201);
    }
    let record: Fri | undefined;
    const token = "token" in body ? body.token : undefined;
    if (
      body.action === "receipt" ||
      (body.action === "pdf" && token) ||
      body.action === "quotation-receipt" ||
      body.action === "quotation-pdf"
    ) {
      await limit(`receipt:${ip}`, 60, 60);
      const { data, error } = await admin.rpc("tmb_read_receipt", {
        p_id: body.id,
        p_token: token,
      });
      if (error) throw error;
      if (!data?.[0]) throw new HttpError(404, "Solicitud no encontrada");
      record = map(data[0]);
      if (body.action === "receipt") return json(record);
      if (body.action === "quotation-receipt" || body.action === "quotation-pdf") {
        const { data: quotation, error: quotationError } = await admin.from(
          "tmb_quotations",
        ).select("input,settings_snapshot,calculation,updated_at")
          .eq("request_id", body.id).maybeSingle();
        if (quotationError) throw quotationError;
        if (body.action === "quotation-receipt") {
          return json({
            available: Boolean(quotation),
            updatedAt: quotation?.updated_at ?? null,
          });
        }
        if (!quotation) throw new HttpError(404, "La cotización todavía no está disponible");
        const { QuotationPdfService } = await import("../_shared/quotation-pdf.ts");
        const pdf = await new QuotationPdfService().generate(record, {
          input: quotation.input,
          settings: quotation.settings_snapshot,
          calculation: quotation.calculation,
          updatedAt: quotation.updated_at,
        });
        const safeCode = record.code.replace(/[^a-zA-Z0-9-]/g, "-");
        return new Response(new Uint8Array(pdf), {
          headers: {
            ...headers,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="PROFORMA-${safeCode}.pdf"`,
          },
        });
      }
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
      if (body.action === "catalog-admin-list") {
        const search = (body.query || "").replace(/[^\p{L}\p{N}\s&./-]/gu, " ").trim();
        let query = admin.from("tmb_vehicle_catalog").select(
          "id,source_type,brand,model,variant,year,vehicle_type,fuel,transmission,engine,drive_type,color,price,currency,price_label,image_url,source_url,source_reference,updated_at,last_seen_at,is_active,is_published",
        ).order("updated_at", { ascending: false }).limit(100);
        if (body.source && body.source !== "all") {
          query = query.eq("source_type", body.source);
        }
        if (search) {
          const term = `%${search.slice(0, 50)}%`;
          query = query.or(`brand.ilike.${term},model.ilike.${term},variant.ilike.${term}`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return json(data || []);
      }
      if (body.action === "catalog-publish") {
        const { data, error } = await admin.from("tmb_vehicle_catalog")
          .update({
            is_published: body.published,
            published_at: body.published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }).eq("id", body.id).eq("is_active", true).select("id").maybeSingle();
        if (error) throw error;
        if (!data) throw new HttpError(404, "Vehículo no encontrado");
        return json({ success: true });
      }
      if (body.action === "catalog-sync-status") {
        return json(await getCatalogSyncStatus(admin));
      }
      if (body.action === "catalog-sync") {
        return json(await runCatalogSyncBatch(admin, seller.id));
      }
      if (body.action === "quotation-settings-get") {
        const { data, error } = await admin.from("tmb_quotation_settings")
          .select("config").eq("id", 1).maybeSingle();
        if (error) throw error;
        const settings = quotationSettingsSchema.safeParse(data?.config);
        if (!settings.success) {
          throw new Error("Quotation settings are missing or invalid");
        }
        return json(settings.data);
      }
      if (body.action === "quotation-settings-update") {
        const settings = quotationSettingsSchema.safeParse(body.values);
        if (!settings.success) {
          throw new HttpError(400, "Revisa los valores de configuración");
        }
        const { error } = await admin.from("tmb_quotation_settings").upsert({
          id: 1,
          config: settings.data,
          updated_at: new Date().toISOString(),
          updated_by: seller.id,
        });
        if (error) throw error;
        return json(settings.data);
      }
      if (body.action === "quotation-get") {
        const { data, error } = await admin.from("tmb_quotations")
          .select("id,request_id,input,settings_snapshot,calculation,created_at,updated_at")
          .eq("request_id", body.id).maybeSingle();
        if (error) throw error;
        return json(data ? {
          id: data.id,
          requestId: data.request_id,
          input: data.input,
          settings: data.settings_snapshot,
          calculation: data.calculation,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } : null);
      }
      if (body.action === "quotation-save") {
        const input = quotationInputSchema.safeParse(body.input);
        if (!input.success) {
          throw new HttpError(400, "Revisa los valores de la cotización");
        }
        const [
          { data: baseRow, error: settingsError },
          { data: friRow, error: friError },
          { data: existingQuote, error: quotationError },
        ] = await Promise.all([
          admin.from("tmb_quotation_settings").select("config").eq("id", 1).maybeSingle(),
          admin.from("tmb_fri_requests").select("id,status").eq("id", body.id).maybeSingle(),
          admin.from("tmb_quotations").select("settings_snapshot").eq("request_id", body.id).maybeSingle(),
        ]);
        if (settingsError) throw settingsError;
        if (friError) throw friError;
        if (quotationError) throw quotationError;
        if (!friRow) throw new HttpError(404, "Solicitud no encontrada");
        if (!["En revisión", "Cotizado"].includes(friRow.status)) {
          throw new HttpError(409, "La solicitud debe estar en revisión para cotizar");
        }
        const base = quotationSettingsSchema.parse(
          existingQuote?.settings_snapshot ?? baseRow?.config ?? defaultQuotationSettings,
        );
        const calculation = calculateQuotation(input.data, base);
        const { data, error } = await admin.from("tmb_quotations").upsert({
          request_id: body.id,
          seller_id: seller.id,
          input: input.data,
          settings_snapshot: base,
          calculation,
          updated_at: new Date().toISOString(),
        }, { onConflict: "request_id" }).select(
          "id,request_id,input,settings_snapshot,calculation,created_at,updated_at",
        ).single();
        if (error) throw error;
        if (friRow.status !== "Cotizado") {
          const { error: statusError } = await admin.from("tmb_fri_requests")
            .update({ status: "Cotizado" }).eq("id", body.id).eq("status", "En revisión");
          if (statusError) throw statusError;
        }
        return json({
          id: data.id,
          requestId: data.request_id,
          input: data.input,
          settings: data.settings_snapshot,
          calculation: data.calculation,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
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
