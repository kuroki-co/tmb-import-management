import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";

const catalogHost = "https://hiluxperu.com";
const pageBatchSize = 3;
const requestTimeoutMs = 15_000;

export type ScrapedVehicle = {
  source_key: string;
  brand: string;
  model: string;
  variant: string;
  year: number | null;
  vehicle_type: string | null;
  fuel: string | null;
  transmission: string | null;
  engine: string | null;
  drive_type: string | null;
  color: string | null;
  price: number | null;
  currency: "USD";
  price_label: string | null;
  image_url: string | null;
  source_url: string;
  source_reference: string | null;
  raw_data: Record<string, unknown>;
};

export type CatalogSyncStatus = {
  status: string;
  pagesProcessed: number;
  vehiclesSeen: number;
  pendingPages: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function htmlText(value: string): string {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function classContent(html: string, className: string): string | undefined {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<([a-z0-9]+)[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
      "i",
    ),
  );
  return match?.[2];
}

function classAttributeValue(html: string, className: string, attribute: string) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<[a-z0-9]+[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*\\b${attribute}=["']([^"']+)["']`,
      "i",
    ),
  );
  return match?.[1] ? decodeEntities(match[1]) : undefined;
}

function cardBlocks(html: string): string[] {
  // The supplier replaced the `<!-- single product -->` markers with one
  // `.dev-h-stocklist-row` element per vehicle. Prefer the structural marker
  // and keep the comment-based split as a fallback for older page versions.
  const rowStarts = [...html.matchAll(
    /<div\b(?=[^>]*\bclass=["'][^"']*\bdev-h-stocklist-row\b[^"']*["'])[^>]*>/gi,
  )];
  if (rowStarts.length > 0) {
    return rowStarts.map((match, index) => {
      const start = match.index ?? 0;
      const end = rowStarts[index + 1]?.index ?? html.length;
      return html.slice(start, end);
    });
  }

  const chunks = html.split(/<!--\s*single product\s*-->/i).slice(1);
  return chunks.map((chunk) => {
    const stop = chunk.search(/<!--\s*single product\s*-->|<nav\b[^>]*class=["'][^"']*pagination/i);
    return stop >= 0 ? chunk.slice(0, stop) : chunk;
  }).filter((block) => /dev-h-stocklist-row/i.test(block));
}

function specValues(block: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const match of block.matchAll(
    /<div\s+class=["']dev-h-mob-([a-z-]+)["'][^>]*>\s*([^:<]+):\s*<span[^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    const key = htmlText(match[1]).toLowerCase();
    const label = htmlText(match[2]).toLowerCase();
    const value = htmlText(match[3]);
    values[label] = value;
    values[key] = value;
  }
  return values;
}

function parseMoney(value: string): number | null {
  const cleaned = htmlText(value).replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/,/g, "")
    : cleaned.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function parseManufacturerLinks(html: string): string[] {
  const urls = new Set<string>();
  const linkPattern = /<a\b[^>]*href=["'](https?:\/\/hiluxperu\.com\/stocklist\/\d+\/maker\/[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const count = htmlText(match[2]).match(/\((\d+)\)/);
    if (count && Number(count[1]) > 0) urls.add(match[1]);
  }
  return [...urls];
}

export function parseNextPage(html: string): string | undefined {
  const match = html.match(
    /<a\b(?=[^>]*\brel=["']next["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
  );
  if (!match?.[1]) return undefined;
  const url = new URL(decodeEntities(match[1]), catalogHost);
  if (url.origin !== catalogHost || !url.pathname.startsWith("/stocklist/")) {
    return undefined;
  }
  return url.toString();
}

function stripBrandPrefix(model: string, brand: string) {
  let result = model.trim();
  while (
    brand &&
    result.slice(0, brand.length).toLocaleLowerCase("es") === brand.toLocaleLowerCase("es") &&
    /^[\s\-–—:]/u.test(result.slice(brand.length))
  ) {
    result = result.slice(brand.length).replace(/^[\s\-–—:]+/u, "").trim();
  }
  return result;
}

export function parseInventoryPage(html: string, pageUrl: string): ScrapedVehicle[] {
  const rows: ScrapedVehicle[] = [];
  for (const block of cardBlocks(html)) {
    const detail = block.match(/href=["'](https?:\/\/hiluxperu\.com\/detail\/([^/"']+)\/[^"']+)["']/i);
    const heading = classContent(block, "dev-h-model-title")
      ?.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    const title = heading ? htmlText(heading) : "";
    const brandSlug = detail?.[2] ? decodeURIComponent(detail[2]).replace(/-/g, " ") : "";
    const titleWithoutYear = title.replace(/\b(19\d{2}|20\d{2})\b/, " ").trim();
    const brand = titleWithoutYear.toLowerCase().startsWith(brandSlug.toLowerCase())
      ? titleWithoutYear.slice(0, brandSlug.length).trim()
      : brandSlug.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    if (!detail || !brand || !title) {
      throw new Error(`No se pudo interpretar el vehículo ${rows.length + 1} de ${pageUrl}: faltan su marca, modelo o enlace de detalle.`);
    }

    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : null;
    const model = stripBrandPrefix(titleWithoutYear.replace(/\s+/g, " "), brand);
    const priceLabel = classContent(block, "dev-h-price-title");
    const priceValue = classContent(block, "dev-h-price-value");
    const specs = specValues(block);
    const reference = classContent(block, "dev-h-ref-no");
    const sourceReference = reference
      ? htmlText(reference).replace(/^Ref No\.\s*/i, "")
      : null;
    const sourceUrl = detail[1];
    const image = classAttributeValue(block, "dev-h-wrapper-img", "src") ??
      block.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1];
    const refKey = sourceReference || sourceUrl;
    const fuel = specs.fuel || null;
    const transmission = specs.trans || null;
    const engine = specs.engine || null;
    const driveType = specs.drive || null;
    const listedYear = specs.year?.match(/\b(19\d{2}|20\d{2})\b/);
    const sourceKey = `hiluxperu:${refKey.toUpperCase()}`;
    rows.push({
      source_key: sourceKey,
      brand,
      model: model || title,
      variant: [specs.type, engine, driveType, transmission].filter(Boolean).join(" · "),
      year: year ?? (listedYear ? Number(listedYear[1]) : null),
      vehicle_type: specs.type || null,
      fuel,
      transmission,
      engine,
      drive_type: driveType,
      color: specs.color || null,
      price: priceValue ? parseMoney(priceValue) : null,
      currency: "USD",
      price_label: priceLabel ? htmlText(priceLabel).replace(/:$/, "") : null,
      image_url: image ? new URL(decodeEntities(image), catalogHost).toString() : null,
      source_url: sourceUrl,
      source_reference: sourceReference,
      raw_data: { title, pageUrl, specs },
    });
  }
  return rows;
}

export function dedupeVehiclesBySourceKey(rows: ScrapedVehicle[]): ScrapedVehicle[] {
  return [...new Map(rows.map((vehicle) => [vehicle.source_key, vehicle])).values()];
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "TMB-Vehicle-Catalog/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Catálogo respondió HTTP ${response.status}`);
    const html = await response.text();
    if (html.length < 500 || html.length > 4_000_000) {
      throw new Error("Tamaño inesperado de página del catálogo");
    }
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

async function readSyncState(admin: SupabaseClient) {
  const { data, error } = await admin.from("tmb_vehicle_catalog_sync_state")
    .select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

function toStatus(row: Record<string, unknown>): CatalogSyncStatus {
  return {
    status: String(row.status || "idle"),
    pagesProcessed: Number(row.pages_processed || 0),
    vehiclesSeen: Number(row.vehicles_seen || 0),
    pendingPages: Array.isArray(row.pending_urls) ? row.pending_urls.length : 0,
    lastAttemptAt: typeof row.last_attempt_at === "string" ? row.last_attempt_at : null,
    lastSuccessAt: typeof row.last_success_at === "string" ? row.last_success_at : null,
    lastError: typeof row.last_error === "string" ? row.last_error : null,
  };
}

function extractionErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === "string" ? `${candidate.code}: ` : "";
    if (typeof candidate.message === "string") {
      return `${code}${candidate.message}`.slice(0, 500);
    }
  }
  return "Error de extracción";
}

export async function getCatalogSyncStatus(admin: SupabaseClient) {
  return toStatus(await readSyncState(admin));
}

export async function runCatalogSyncBatch(
  admin: SupabaseClient,
  triggeredBy?: string,
): Promise<CatalogSyncStatus> {
  const { data: claimed, error: claimError } = await admin.rpc(
    "tmb_claim_vehicle_catalog_sync",
    { p_lease_seconds: 180 },
  );
  if (claimError) throw claimError;
  if (!claimed) return getCatalogSyncStatus(admin);

  let state: Record<string, unknown> | null = null;
  try {
    state = await readSyncState(admin);
    if (!state) throw new Error("No se pudo leer el estado de sincronización del catálogo.");
    let runId = typeof state.active_run_id === "string" ? state.active_run_id : null;
    let queue = Array.isArray(state.pending_urls)
      ? state.pending_urls.filter((url): url is string => typeof url === "string")
      : [];
    if (!runId || queue.length === 0) {
      const home = await fetchHtml(catalogHost);
      const manufacturers = parseManufacturerLinks(home);
      if (manufacturers.length === 0) {
        throw new Error("No se encontraron marcas en el catálogo. Se conserva la última sincronización válida.");
      }
      const { data: run, error: runError } = await admin.from(
        "tmb_vehicle_catalog_sync_runs",
      ).insert({ source: "tmb_web", status: "running", triggered_by: triggeredBy ?? null })
        .select("id").single();
      if (runError) throw runError;
      runId = run.id;
      queue = manufacturers;
      const { error } = await admin.from("tmb_vehicle_catalog_sync_state").update({
        active_run_id: runId,
        pending_urls: queue,
        status: "running",
        pages_processed: 0,
        vehicles_seen: 0,
        last_error: null,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", 1);
      if (error) throw error;
    }

    const currentBatch = queue.slice(0, pageBatchSize);
    const outcomes = await Promise.all(currentBatch.map(async (url) => {
      try {
        const html = await fetchHtml(url);
        const vehicles = parseInventoryPage(html, url);
        const nextUrl = parseNextPage(html);
        if (vehicles.length === 0) {
          throw new Error("La página no contiene vehículos legibles.");
        }
        return { url, vehicles, nextUrl };
      } catch (error) {
        throw new Error(`No se pudo extraer ${url}: ${extractionErrorMessage(error)}`);
      }
    }));
    const runIdValue = String(runId);
    const rows = dedupeVehiclesBySourceKey(outcomes.flatMap(({ vehicles }) => vehicles.map((vehicle) => ({
      ...vehicle,
      source_type: "tmb_web",
      source_reference: vehicle.source_reference ?? vehicle.source_url,
      raw_data: { ...vehicle.raw_data, runId: runIdValue },
    }))));
    if (rows.length > 0) {
      const { error } = await admin.rpc("tmb_upsert_scraped_vehicle_catalog", {
        p_rows: rows,
        p_run_id: runIdValue,
      });
      if (error) throw error;
    }
    const consumed = new Set(currentBatch);
    const nextQueue = queue.filter((url) => !consumed.has(url));
    for (const next of outcomes.map((result) => result.nextUrl).filter(Boolean) as string[]) {
      if (!nextQueue.includes(next)) nextQueue.push(next);
    }
    const processed = Number(state.pages_processed || 0) + outcomes.length;
    const seen = Number(state.vehicles_seen || 0) + rows.length;
    const finished = nextQueue.length === 0;
    const now = new Date().toISOString();
    if (finished) {
      const { count: activeBefore, error: countError } = await admin
        .from("tmb_vehicle_catalog")
        .select("id", { count: "exact", head: true })
        .eq("source_type", "tmb_web")
        .eq("is_active", true);
      if (countError) throw countError;
      if ((activeBefore ?? 0) >= 20 && seen < (activeBefore ?? 0) * 0.5) {
        throw new Error("La extracción devolvió menos de la mitad del catálogo web anterior. Se conserva el catálogo activo para revisión.");
      }
      const { error: staleError } = await admin.from("tmb_vehicle_catalog")
        .update({ is_active: false, updated_at: now })
        .eq("source_type", "tmb_web")
        .or(`last_seen_run_id.is.null,last_seen_run_id.neq.${runIdValue}`);
      if (staleError) throw staleError;
      const { error: runError } = await admin.from("tmb_vehicle_catalog_sync_runs")
        .update({ status: "completed", completed_at: now, pages_processed: processed, vehicles_seen: seen })
        .eq("id", runIdValue);
      if (runError) throw runError;
    } else {
      const { error: runError } = await admin.from("tmb_vehicle_catalog_sync_runs")
        .update({ status: "running", pages_processed: processed, vehicles_seen: seen })
        .eq("id", runIdValue);
      if (runError) throw runError;
    }
    const { error: stateError } = await admin.from("tmb_vehicle_catalog_sync_state")
      .update({
        active_run_id: finished ? null : runIdValue,
        pending_urls: nextQueue,
        status: finished ? "completed" : "running",
        pages_processed: processed,
        vehicles_seen: seen,
        last_attempt_at: now,
        last_success_at: finished ? now : state.last_success_at,
        last_error: null,
        lock_until: null,
        updated_at: now,
      }).eq("id", 1);
    if (stateError) throw stateError;
    return getCatalogSyncStatus(admin);
  } catch (error) {
    const message = extractionErrorMessage(error);
    const now = new Date().toISOString();
    if (state?.active_run_id) {
      await admin.from("tmb_vehicle_catalog_sync_runs").update({ status: "failed", error_message: message })
        .eq("id", state.active_run_id);
    }
    await admin.from("tmb_vehicle_catalog_sync_state").update({
      status: "failed",
      last_attempt_at: now,
      last_error: message,
      lock_until: null,
      updated_at: now,
    }).eq("id", 1);
    throw error;
  }
}
