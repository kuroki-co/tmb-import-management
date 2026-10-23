"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CarFront, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  getCatalogSyncStatus,
  listCatalogAdmin,
  publishCatalogVehicle,
  syncCatalog,
  type CatalogSyncStatus,
  type CatalogVehicle,
} from "@/features/vehicle-catalog/api";

type SourceFilter = "all" | "supplier_excel" | "tmb_web";
const PAGE_SIZE = 20;

function money(vehicle: CatalogVehicle) {
  if (vehicle.price === null) return "Sin precio publicado";
  return `${vehicle.currency} ${vehicle.price.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
  })}`;
}

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
    : "Aún no sincronizado";
}

export default function VehicleCatalogPage() {
  const [items, setItems] = useState<CatalogVehicle[]>([]);
  const [status, setStatus] = useState<CatalogSyncStatus | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);

  const refresh = useCallback(async () => {
    const [catalog, syncStatus] = await Promise.all([
      listCatalogAdmin(query, source),
      getCatalogSyncStatus(),
    ]);
    setItems(catalog);
    setStatus(syncStatus);
  }, [query, source]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      refresh().then(() => {
        if (active) setError("");
      }).catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, query ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh, query]);

  const counts = useMemo(() => ({
    total: items.length,
    published: items.filter((item) => item.isPublished && item.isActive).length,
    review: items.filter((item) => item.source === "tmb_web" && !item.isPublished && item.isActive).length,
  }), [items]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  async function handleSync() {
    setPage(1);
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const nextStatus = await syncCatalog();
      setStatus(nextStatus);
      setNotice(nextStatus.status === "completed"
        ? "La extracción terminó y el catálogo se actualizó."
        : `Lote procesado: ${nextStatus.pagesProcessed} páginas y ${nextStatus.pendingPages} pendientes. Puedes continuar la sincronización.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo sincronizar el catálogo web.");
    } finally {
      setSyncing(false);
    }
  }

  async function togglePublish(item: CatalogVehicle) {
    try {
      await publishCatalogVehicle(item.id, !item.isPublished);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la publicación.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Gestión comercial</p>
          <h1 className="mt-2 text-2xl font-semibold text-navy">Catálogo de vehículos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            El Excel conserva sus precios FOB. Los precios extraídos del sitio se muestran como referenciales y requieren revisión antes de publicarse en el FRI.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} aria-hidden />
          {syncing ? "Extrayendo…" : "Sincronizar catálogo web"}
        </Button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-accent-border bg-accent-soft p-3 text-sm text-navy">{notice}</p>}

      <section aria-label="Estado de sincronización" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Estado web", status?.status === "running" ? "En proceso" : status?.status === "failed" ? "Con error" : status?.status === "completed" ? "Actualizado" : "Pendiente"],
          ["Páginas procesadas", String(status?.pagesProcessed ?? 0)],
          ["Vehículos leídos", String(status?.vehiclesSeen ?? 0)],
          ["Última extracción", date(status?.lastSuccessAt ?? null)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-navy">{value}</p>
          </div>
        ))}
      </section>
      {status?.pendingPages ? <p className="text-xs text-muted">Quedan {status.pendingPages} páginas en cola. La extracción avanza en lotes para no sobrecargar el sitio.</p> : null}
      {status?.lastError && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Último error de extracción: {status.lastError}. Se conservan los datos de la última sincronización correcta.</p>}

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 md:p-5">
          <div>
            <h2 className="font-semibold text-navy">Vehículos importados</h2>
            <p className="mt-1 text-xs text-muted">{counts.total} en esta vista · {counts.published} publicados · {counts.review} por revisar</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="relative sm:w-72">
              <span className="sr-only">Buscar vehículos</span>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${inputClass} pl-10`} value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Marca, modelo o versión" />
            </label>
            <select className={`${inputClass} sm:w-52`} value={source} onChange={(event) => { setPage(1); setSource(event.target.value as SourceFilter); }} aria-label="Filtrar por origen">
              <option value="all">Todos los orígenes</option>
              <option value="supplier_excel">Excel proveedor · FOB</option>
              <option value="tmb_web">Sitio web · referencial</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Vehículo</th>
                <th scope="col" className="px-5 py-3 font-medium">Origen</th>
                <th scope="col" className="px-5 py-3 font-medium">Precio registrado</th>
                <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">Cargando catálogo…</td></tr> : null}
              {!loading && items.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">No encontramos vehículos con esos filtros.</td></tr> : null}
              {!loading && pageItems.map((item) => (
                <tr key={item.id} className="align-middle">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary"><CarFront size={18} aria-hidden /></span>
                      <span><span className="block font-semibold text-navy">{item.brand} {item.model}</span><span className="mt-1 block text-xs text-muted">{[item.year, item.variant].filter(Boolean).join(" · ") || "Sin versión indicada"}</span></span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted">{item.source === "supplier_excel" ? "Excel proveedor" : "Sitio web TMB"}</td>
                  <td className="px-5 py-4"><span className="font-medium">{money(item)}</span><span className="mt-1 block text-xs text-muted">{item.priceLabel || (item.source === "tmb_web" ? "Precio referencial" : "FOB (USD)")}</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? item.isPublished ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900" : "bg-gray-100 text-gray-600"}`}>{!item.isActive ? "Inactivo" : item.isPublished ? "Publicado" : "Borrador"}</span></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Ver fuente de ${item.brand} ${item.model}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-background"><ArrowUpRight size={16} aria-hidden /></a>}
                      <Button variant="secondary" onClick={() => void togglePublish(item)} disabled={!item.isActive}>{item.isPublished ? "Ocultar" : "Publicar"}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && items.length > PAGE_SIZE && (
          <TablePagination
            label="vehículos del catálogo"
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalItems={items.length}
            onPageChange={setPage}
          />
        )}
      </section>
      <p className="text-xs leading-5 text-muted">El precio de la página externa puede ser un precio de exhibición, no un FOB. Se conserva la etiqueta original de la fuente y no se mezclan ambos tipos de precio.</p>
    </div>
  );
}
