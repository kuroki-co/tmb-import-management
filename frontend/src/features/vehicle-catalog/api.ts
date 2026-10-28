import { z } from "zod";
import { callFriFunction } from "@/lib/supabase/functions";

const vehicleSchema = z.object({
  id: z.uuid(),
  source_type: z.enum(["supplier_excel", "tmb_web"]),
  brand: z.string(),
  model: z.string(),
  variant: z.string().nullable().optional(),
  year: z.number().nullable(),
  vehicle_type: z.string().nullable(),
  fuel: z.string().nullable(),
  transmission: z.string().nullable(),
  engine: z.string().nullable(),
  drive_type: z.string().nullable(),
  color: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string(),
  price_label: z.string().nullable(),
  image_url: z.url().nullable(),
  source_url: z.url().nullable(),
  source_reference: z.string().nullable(),
  updated_at: z.string(),
  last_seen_at: z.string().optional(),
  is_active: z.boolean().optional(),
  is_published: z.boolean().optional(),
}).transform((row) => ({
  id: row.id,
  source: row.source_type,
  brand: row.brand,
  model: row.model,
  variant: row.variant || "",
  year: row.year,
  vehicleType: row.vehicle_type,
  fuel: row.fuel,
  transmission: row.transmission,
  engine: row.engine,
  driveType: row.drive_type,
  color: row.color,
  price: row.price,
  currency: row.currency,
  priceLabel: row.price_label,
  imageUrl: row.image_url,
  sourceUrl: row.source_url,
  sourceReference: row.source_reference,
  updatedAt: row.updated_at,
  lastSeenAt: row.last_seen_at,
  isActive: row.is_active,
  isPublished: row.is_published,
}));
export type CatalogVehicle = z.infer<typeof vehicleSchema>;

const CATALOG_PAGE_SIZE = 1000;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
let catalogCache: { expiresAt: number; vehicles: CatalogVehicle[] } | null = null;
let catalogRequest: Promise<CatalogVehicle[]> | null = null;

/** Loads the public catalog once so the FRI autocomplete can filter locally. */
export function getPublicCatalogIndex() {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return Promise.resolve(catalogCache.vehicles);
  }
  if (catalogRequest) return catalogRequest;

  catalogRequest = (async () => {
    const vehicles: CatalogVehicle[] = [];
    for (let offset = 0; ; offset += CATALOG_PAGE_SIZE) {
      const page = vehicleSchema.array().parse(await callFriFunction({
        action: "catalog-search-index",
        offset,
      }));
      vehicles.push(...page);
      if (page.length < CATALOG_PAGE_SIZE) break;
    }
    catalogCache = { vehicles, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
    return vehicles;
  })().finally(() => {
    catalogRequest = null;
  });

  return catalogRequest;
}

const syncStatusSchema = z.object({
  status: z.string(),
  pagesProcessed: z.number(),
  vehiclesSeen: z.number(),
  pendingPages: z.number(),
  lastAttemptAt: z.string().nullable(),
  lastSuccessAt: z.string().nullable(),
  lastError: z.string().nullable(),
});
export type CatalogSyncStatus = z.infer<typeof syncStatusSchema>;

export async function searchCatalog(query: string) {
  const result = await callFriFunction({
    action: "catalog-list",
    query: query.trim().slice(0, 60),
  });
  return vehicleSchema.array().parse(result);
}

export async function getCatalogVehicle(id: string) {
  const result = await callFriFunction({ action: "catalog-get", id });
  return result === null ? null : vehicleSchema.parse(result);
}

export async function listCatalogAdmin(query = "", source = "all") {
  const result = await callFriFunction({
    action: "catalog-admin-list",
    query: query.trim().slice(0, 60),
    source,
  }, true);
  return vehicleSchema.array().parse(result);
}

export async function publishCatalogVehicle(id: string, published: boolean) {
  await callFriFunction({ action: "catalog-publish", id, published }, true);
}

export async function getCatalogSyncStatus() {
  return syncStatusSchema.parse(
    await callFriFunction({ action: "catalog-sync-status" }, true),
  );
}

export async function syncCatalog() {
  return syncStatusSchema.parse(
    await callFriFunction({ action: "catalog-sync" }, true),
  );
}
