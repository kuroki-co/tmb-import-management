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
import {
  calendarAccessToken,
  calendarConnected,
  encryptRefreshToken,
  googleRequest,
} from "../_shared/google-calendar.ts";

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
  z.object({
    action: z.literal("catalog-search-index"),
    offset: z.number().int().min(0).max(100_000),
  }).strict(),
  z.object({ action: z.literal("catalog-get"), id: z.uuid() }).strict(),
  z.object({
    action: z.literal("catalog-admin-list"),
    query: z.string().max(60).optional(),
    source: z.enum(["all", "supplier_excel", "tmb_web"]).optional(),
    page: z.number().int().min(1).max(100_000).optional(),
    pageSize: z.union([z.literal(6), z.literal(10), z.literal(15), z.literal(20)]).optional(),
  }).strict(),
  z.object({
    action: z.literal("catalog-publish"),
    id: z.uuid(),
    published: z.boolean(),
  }).strict(),
  z.object({ action: z.literal("catalog-sync-status") }).strict(),
  z.object({ action: z.literal("catalog-sync") }).strict(),
  z.object({ action: z.literal("quotation-settings-get") }).strict(),
  z.object({ action: z.literal("calendar-status") }).strict(),
  z.object({ action: z.literal("calendar-connect") }).strict(),
  z.object({ action: z.literal("calendar-agenda") }).strict(),
  z.object({ action: z.literal("email-status") }).strict(),
  z.object({ action: z.literal("email-test") }).strict(),
  z.object({
    action: z.literal("calendar-slots"),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).strict(),
  z.object({
    action: z.literal("calendar-book"),
    id: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
    startsAt: z.string().datetime({ offset: true }),
  }).strict(),
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
  z.object({ action: z.literal("quotation-send"), id: z.uuid() }).strict(),
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
    if (body.action === "catalog-search-index") {
      await limit(`catalog:public:${ip}`, 60, 60);
      const pageSize = 1000;
      const { data, error } = await admin.from("tmb_vehicle_catalog").select(
        "id,source_type,brand,model,variant,year,vehicle_type,fuel,transmission,engine,drive_type,color,price,currency,price_label,image_url,source_url,source_reference,updated_at",
      ).eq("is_active", true).eq("is_published", true)
        .order("brand", { ascending: true })
        .order("model", { ascending: true })
        .order("variant", { ascending: true })
        .order("id", { ascending: true })
        .range(body.offset, body.offset + pageSize - 1);
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
      let emailStatus: "sent" | "failed" | "not_provided" | "not_configured" =
        "not_provided";
      const recipient = validated.data.email?.trim() || "";
      if (recipient) {
        const apiKey = Deno.env.get("RESEND_API_KEY");
        const sender = Deno.env.get("RESEND_FROM_EMAIL")?.trim();
        if (!apiKey || !sender) {
          emailStatus = "not_configured";
        } else {
          try {
            const { data: request, error: requestError } = await admin
              .from("tmb_fri_requests")
              .select("id,created_at,code,status,data")
              .eq("id", data)
              .maybeSingle();
            if (requestError || !request) throw new Error("FRI record unavailable");
            const fri = map(request);
            const { PdfService } = await import("../_shared/pdf.ts");
            const pdf = await new PdfService().generate(fri);
            const safeCode = fri.code.replace(/[^a-zA-Z0-9-]/g, "-");
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `tmb-fri-confirmation-${data}`,
              },
              body: JSON.stringify({
                from: sender,
                to: [recipient],
                subject: `Solicitud FRI recibida · ${fri.code}`,
                html: `<div style="font-family:Arial,sans-serif;color:#12385b"><h1 style="font-size:20px">Recibimos tu solicitud</h1><p>Adjuntamos el PDF de tu ficha de requerimiento de importación.</p><p>Código de solicitud: <strong>${fri.code}</strong></p><p>El equipo de TMB revisará la información y preparará una cotización referencial.</p></div>`,
                text: `Recibimos tu solicitud FRI. Adjuntamos el PDF de tu ficha. Código de solicitud: ${fri.code}. El equipo de TMB revisará la información y preparará una cotización referencial.`,
                attachments: [{
                  filename: `FRI-${safeCode}.pdf`,
                  content: pdf.toString("base64"),
                }],
              }),
            });
            emailStatus = response.ok ? "sent" : "failed";
            if (!response.ok) await response.text().catch(() => "");
          } catch {
            emailStatus = "failed";
          }
        }
      }
      return json({
        id: data,
        receiptToken: body.receiptToken,
        emailStatus,
      }, 201);
    }
    if (body.action === "calendar-slots") {
      await limit(`calendar:slots:${ip}`, 60, 60);
      const dayStart = new Date(`${body.day}T00:00:00-05:00`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));
      const targetDay = new Date(`${body.day}T12:00:00-05:00`);
      const daysAhead = Math.floor((targetDay.getTime() - new Date(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T12:00:00-05:00`).getTime()) / 86400000);
      if (daysAhead < 0 || daysAhead > 60 || targetDay.getDay() === 0 || targetDay.getDay() === 6) {
        throw new HttpError(400, "Elige un día hábil dentro de los próximos 60 días");
      }
      const connection = await calendarConnected(admin);
      if (!connection) return json({ connected: false, slots: [] });
      const accessToken = await calendarAccessToken(admin);
      const busy = await googleRequest<{ calendars?: { primary?: { busy?: { start: string; end: string }[] } } }>(
        accessToken,
        "/freeBusy",
        {
          method: "POST",
          body: JSON.stringify({
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            timeZone: "America/Lima",
            items: [{ id: "primary" }],
          }),
        },
      );
      const busyPeriods = busy.calendars?.primary?.busy || [];
      const { data: localBookings, error: bookingError } = await admin.from("tmb_appointments")
        .select("starts_at,ends_at").gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString());
      if (bookingError) throw bookingError;
      const intervals = [...busyPeriods, ...(localBookings || []).map((booking) => ({ start: booking.starts_at, end: booking.ends_at }))];
      const now = Date.now();
      const slots: string[] = [];
      for (let minute = 9 * 60; minute < 17 * 60; minute += 30) {
        const hour = Math.floor(minute / 60);
        const min = minute % 60;
        const start = new Date(`${body.day}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00-05:00`);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        if (start.getTime() <= now + 60 * 60 * 1000) continue;
        const overlaps = intervals.some((period) => new Date(period.start).getTime() < end.getTime() && new Date(period.end).getTime() > start.getTime());
        if (!overlaps) slots.push(start.toISOString());
      }
      return json({ connected: true, slots, timeZone: "America/Lima" });
    }
    if (body.action === "calendar-book") {
      await limit(`calendar:book:${ip}`, 10, 3600);
      const startsAt = new Date(body.startsAt);
      const now = Date.now();
      if (startsAt.getTime() < now + 60 * 60 * 1000 || startsAt.getTime() > now + 61 * 86400000) {
        throw new HttpError(400, "El horario seleccionado ya no está disponible");
      }
      const lima = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(startsAt).reduce<Record<string, string>>((parts, part) => { parts[part.type] = part.value; return parts; }, {});
      const minute = Number(lima.minute);
      const hour = Number(lima.hour);
      if (["Sat", "Sun"].includes(lima.weekday) || hour < 9 || hour >= 17 || (minute !== 0 && minute !== 30)) {
        throw new HttpError(400, "El horario seleccionado no corresponde a un espacio válido");
      }
      const { data: rows, error: receiptError } = await admin.rpc("tmb_read_receipt", { p_id: body.id, p_token: body.token });
      if (receiptError) throw receiptError;
      const fri = rows?.[0];
      if (!fri) throw new HttpError(404, "No encontramos la solicitud FRI");
      const connection = await calendarConnected(admin);
      if (!connection) throw new HttpError(503, "Agenda todavía no está conectada. Inténtalo más tarde.");
      const starts = startsAt.toISOString();
      const ends = new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString();
      const accessToken = await calendarAccessToken(admin);
      const availability = await googleRequest<{ calendars?: { primary?: { busy?: { start: string; end: string }[] } } }>(
        accessToken,
        "/freeBusy",
        { method: "POST", body: JSON.stringify({ timeMin: starts, timeMax: ends, timeZone: "America/Lima", items: [{ id: "primary" }] }) },
      );
      if (availability.calendars?.primary?.busy?.length) {
        throw new HttpError(409, "Ese horario acaba de ocuparse. Actualiza la disponibilidad y elige otro.");
      }
      const data = recordDataSchema.parse(fri.data);
      const { data: appointment, error: insertError } = await admin.from("tmb_appointments").insert({
        request_id: fri.id,
        request_code: fri.code,
        starts_at: starts,
        ends_at: ends,
        client_name: data.name,
        vehicle: `${data.brand} ${data.model}`,
        status: "pending",
      }).select("id").single();
      if (insertError) {
        if (insertError.code === "23505") throw new HttpError(409, "Este horario o solicitud ya tiene una cita. Actualiza la agenda y elige otro espacio.");
        throw insertError;
      }
      try {
        const event = await googleRequest<{ id: string }>(accessToken, "/calendars/primary/events", {
          method: "POST",
          body: JSON.stringify({
            summary: `Reunión TMB · ${fri.code} · ${data.name}`,
            description: `Solicitud: ${fri.code}\nCliente: ${data.name}\nVehículo: ${data.brand} ${data.model}`,
            start: { dateTime: starts, timeZone: "America/Lima" },
            end: { dateTime: ends, timeZone: "America/Lima" },
          }),
        });
        const { error: updateError } = await admin.from("tmb_appointments")
          .update({ status: "confirmed", google_event_id: event.id }).eq("id", appointment.id);
        if (updateError) throw updateError;
        return json({ success: true, startsAt: starts, endsAt: ends });
      } catch (error) {
        await admin.from("tmb_appointments").delete().eq("id", appointment.id);
        throw error;
      }
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
      if (body.action === "calendar-status") {
        return json({ connection: await calendarConnected(admin) });
      }
      if (body.action === "calendar-connect") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        if (!clientId) {
          throw new HttpError(503, "Configura Google Calendar en Supabase para conectar la agenda.");
        }
        const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || `${url}/functions/v1/calendar-oauth-callback`;
        const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const stateHash = await hash(state);
        const { error: stateError } = await admin.from("tmb_calendar_oauth_states").insert({
          state_hash: stateHash,
          seller_id: seller.id,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        if (stateError) throw stateError;
        const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authorize.search = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
          access_type: "offline",
          prompt: "consent",
          state,
        }).toString();
        return json({ url: authorize.toString() });
      }
      if (body.action === "calendar-agenda") {
        const [connection, result] = await Promise.all([
          calendarConnected(admin),
          admin.from("tmb_appointments").select("id,request_id,request_code,starts_at,ends_at,client_name,vehicle,status")
            .gte("starts_at", new Date(Date.now() - 30 * 86400000).toISOString())
            .order("starts_at", { ascending: true }).limit(300),
        ]);
        if (result.error) throw result.error;
        return json({ connection, appointments: result.data || [] });
      }
      if (body.action === "email-status") {
        const sender = Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "";
        return json({
          configured: Boolean(Deno.env.get("RESEND_API_KEY") && sender),
          sender: sender || null,
          testRecipient: verified.user.email || null,
        });
      }
      if (body.action === "email-test") {
        await limit(`seller:resend-test:${seller.id}`, 3, 3600);
        const apiKey = Deno.env.get("RESEND_API_KEY");
        const sender = Deno.env.get("RESEND_FROM_EMAIL")?.trim();
        const recipient = verified.user.email;
        if (!apiKey || !sender) {
          throw new HttpError(503, "Configura RESEND_API_KEY y RESEND_FROM_EMAIL en los secretos de Supabase.");
        }
        if (!recipient) {
          throw new HttpError(400, "La cuenta del vendedor no tiene correo para recibir la prueba.");
        }
        let response: Response;
        try {
          response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `tmb-resend-test-${seller.id}-${crypto.randomUUID()}`,
            },
            body: JSON.stringify({
              from: sender,
              to: [recipient],
              subject: "Prueba de correo · TMB Importaciones",
              html: "<div style=\"font-family:Arial,sans-serif;color:#12385b\"><h1 style=\"font-size:20px\">Conexión de correo lista</h1><p>Este mensaje confirma que TMB puede enviar correos desde Resend.</p></div>",
              text: "Conexión de correo lista. Este mensaje confirma que TMB puede enviar correos desde Resend.",
            }),
          });
        } catch {
          throw new HttpError(502, "No pudimos conectar con Resend. Revisa la conexión e inténtalo de nuevo.");
        }
        if (!response.ok) {
          // Do not return provider payloads, which can contain operational or recipient details.
          await response.text().catch(() => "");
          throw new HttpError(502, "Resend rechazó el envío. Revisa la API key y que el remitente use un dominio verificado.");
        }
        return json({ success: true, recipient });
      }
      if (body.action === "catalog-admin-list") {
        const search = (body.query || "").replace(/[^\p{L}\p{N}\s&./-]/gu, " ").trim();
        const paginated = body.page !== undefined || body.pageSize !== undefined;
        const page = body.page ?? 1;
        const pageSize = body.pageSize ?? 6;
        let query = admin.from("tmb_vehicle_catalog").select(
          "id,source_type,brand,model,variant,year,vehicle_type,fuel,transmission,engine,drive_type,color,price,currency,price_label,image_url,source_url,source_reference,updated_at,last_seen_at,is_active,is_published",
          { count: "exact" },
        ).order("updated_at", { ascending: false });
        if (body.source && body.source !== "all") {
          query = query.eq("source_type", body.source);
        }
        if (search) {
          const term = `%${search.slice(0, 50)}%`;
          query = query.or(`brand.ilike.${term},model.ilike.${term},variant.ilike.${term}`);
        }
        const { data, count, error } = paginated
          ? await query.range((page - 1) * pageSize, page * pageSize - 1)
          : await query.limit(100);
        if (error) throw error;
        return json(paginated ? { items: data || [], total: count ?? 0 } : data || []);
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
      if (body.action === "quotation-send") {
        await limit(`seller:quotation-email:${seller.id}`, 10, 3600);
        const [
          { data: friRow, error: friError },
          { data: quotation, error: quotationError },
        ] = await Promise.all([
          admin.from("tmb_fri_requests")
            .select("id,created_at,code,status,data")
            .eq("id", body.id).maybeSingle(),
          admin.from("tmb_quotations")
            .select("input,settings_snapshot,updated_at")
            .eq("request_id", body.id).maybeSingle(),
        ]);
        if (friError) throw friError;
        if (quotationError) throw quotationError;
        if (!friRow) throw new HttpError(404, "Solicitud no encontrada");
        if (!quotation) throw new HttpError(409, "Guarda la cotización antes de enviarla");
        const fri = map(friRow);
        const recipient = z.email().safeParse(fri.data.email?.trim() || "");
        if (!recipient.success) {
          throw new HttpError(409, "La solicitud no tiene un correo válido para enviar la proforma");
        }
        const apiKey = Deno.env.get("RESEND_API_KEY");
        const sender = Deno.env.get("RESEND_FROM_EMAIL")?.trim();
        if (!apiKey || !sender) {
          throw new HttpError(503, "Configura RESEND_API_KEY y RESEND_FROM_EMAIL en los secretos de Supabase.");
        }
        const input = quotationInputSchema.parse(quotation.input);
        const settings = quotationSettingsSchema.parse(quotation.settings_snapshot);
        const calculation = calculateQuotation(input, settings);
        const { QuotationPdfService } = await import("../_shared/quotation-pdf.ts");
        const pdf = await new QuotationPdfService().generate(fri, {
          input,
          settings,
          calculation,
          updatedAt: quotation.updated_at,
        });
        const safeCode = fri.code.replace(/[^a-zA-Z0-9-]/g, "-");
        let response: Response;
        try {
          response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `tmb-quotation-${await hash(`${body.id}:${quotation.updated_at}`)}`,
            },
            body: JSON.stringify({
              from: sender,
              to: [recipient.data],
              subject: `Cotización comercial TMB · ${fri.code}`,
              html: `<div style="font-family:Arial,sans-serif;color:#12385b"><h1 style="font-size:20px">Tu cotización está lista</h1><p>Adjuntamos la proforma referencial solicitada.</p><p>Solicitud: <strong>${fri.code}</strong></p><p>Los precios, impuestos y gastos están sujetos a confirmación del proveedor y pueden variar.</p><p>Saludos,<br/>TMB Importaciones</p></div>`,
              text: `Tu cotización está lista. Adjuntamos la proforma referencial de la solicitud ${fri.code}. Los precios, impuestos y gastos están sujetos a confirmación del proveedor y pueden variar.\n\nTMB Importaciones`,
              attachments: [{
                filename: `PROFORMA-${safeCode}.pdf`,
                content: pdf.toString("base64"),
              }],
            }),
          });
        } catch {
          throw new HttpError(502, "No pudimos conectar con Resend para enviar la proforma. La cotización sigue guardada; inténtalo de nuevo.");
        }
        if (!response.ok) {
          await response.text().catch(() => "");
          throw new HttpError(502, "Resend rechazó el envío de la proforma. La cotización sigue guardada; revisa la configuración del remitente.");
        }
        return json({ success: true, recipient: recipient.data });
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
