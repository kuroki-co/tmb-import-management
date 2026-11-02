"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CarFront, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableRowsLoadingSkeleton } from "@/components/ui/loading-skeletons";
import {
  getCatalogSyncStatus,
  catalogVehicleName,
  listCatalogAdmin,
  publishCatalogVehicle,
  syncCatalog,
  type CatalogSyncStatus,
  type CatalogVehicle,
} from "@/features/vehicle-catalog/api";

type SourceFilter = "all" | "supplier_excel" | "tmb_web";

function money(vehicle: CatalogVehicle) {
  if (vehicle.price === null) return "Sin precio publicado";
  return `${vehicle.currency} ${vehicle.price.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
  })}`;
}

export default function VehicleCatalogPage() {
  const [items, setItems] = useState<CatalogVehicle[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState<CatalogSyncStatus | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const refresh = useCallback(async (requestedPage = page) => {
    const [catalog, syncStatus] = await Promise.all([
      listCatalogAdmin(query, source, requestedPage, pageSize),
      getCatalogSyncStatus(),
    ]);
    setItems(catalog.items);
    setTotalItems(catalog.total);
    setStatus(syncStatus);
  }, [query, source, page, pageSize]);

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

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items;

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
      await refresh(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo sincronizar el catálogo web.");
      try {
        await refresh();
      } catch {
        // Keep the extraction error visible even if the status endpoint is unavailable.
      }
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
      <PageHeader title="Catálogo de vehículos" eyebrow="Gestión comercial" description="Consulta los vehículos y precios de referencia disponibles para las solicitudes de tus clientes." actions={<><Button onClick={handleSync} disabled={syncing}>
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} aria-hidden />
          {syncing ? "Extrayendo…" : "Actualizar catálogo"}
        </Button></>} />

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-accent-border bg-accent-soft p-3 text-sm text-navy">{notice}</p>}

      {status?.pendingPages ? <p className="text-xs text-muted">Quedan {status.pendingPages} páginas en cola. La extracción avanza en lotes para no sobrecargar el sitio.</p> : null}
      {status?.lastError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No se pudo extraer una parte del catálogo: {status.lastError}. Se conservan los vehículos válidos y puedes volver a intentar la sincronización.</p>}

      <section aria-label="Filtros del catálogo" className="tmb-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-navy">Filtrar vehículos</h2>
            <p className="mt-1 text-xs text-muted">Busca por nombre o acota los resultados por su origen.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="relative sm:w-72">
              <span className="sr-only">Buscar vehículos</span>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${inputClass} pl-10`} value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Marca, modelo o versión" />
            </label>
            <select className={`${inputClass} tmb-select sm:w-52`} value={source} onChange={(event) => { setPage(1); setSource(event.target.value as SourceFilter); }} aria-label="Filtrar por origen">
              <option value="all">Todos los orígenes</option>
              <option value="supplier_excel">Excel proveedor · FOB</option>
              <option value="tmb_web">Sitio web · referencial</option>
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden tmb-card">
        <div className="overflow-x-auto">
          {loading && <p role="status" className="sr-only">Cargando catálogo de vehículos</p>}
          <table className="tmb-data-table w-full min-w-[850px] text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th scope="col" className="px-5 py-4 text-xs font-medium">Vehículo</th>
                <th scope="col" className="px-5 py-4 text-xs font-medium">Origen</th>
                <th scope="col" className="px-5 py-4 text-xs font-medium">Precio registrado</th>
                <th scope="col" className="px-5 py-4 text-xs font-medium">Estado</th>
                <th scope="col" className="px-5 py-4 text-right text-xs font-medium">Acción</th>
              </tr>
            </thead>
            <tbody aria-busy={loading} className="divide-y divide-border">
              {loading ? <TableRowsLoadingSkeleton cells={["vehicle", "text", "price", "status", "actions"]} /> : null}
              {!loading && totalItems === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-muted">No encontramos vehículos con esos filtros.</td></tr> : null}
              {!loading && pageItems.map((item) => (
                <tr key={item.id} className="align-middle transition-colors hover:bg-background/50">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary"><CarFront size={18} aria-hidden /></span>
                      <span><span className="block font-semibold text-navy">{catalogVehicleName(item.brand, item.model)}</span><span className="mt-1 block text-xs text-muted">{[item.year, item.variant].filter(Boolean).join(" · ") || "Sin versión indicada"}</span></span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted">{item.source === "supplier_excel" ? "Excel proveedor" : "Sitio web TMB"}</td>
                  <td className="px-5 py-4"><span className="whitespace-nowrap font-medium tabular-nums">{money(item)}</span><span className="mt-1 block text-xs text-muted">{item.priceLabel || (item.source === "tmb_web" ? "Precio referencial" : "FOB (USD)")}</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.isActive ? item.isPublished ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-600"}`}>{!item.isActive ? "Inactivo" : item.isPublished ? "Publicado" : "Oculto"}</span></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Ver fuente de ${catalogVehicleName(item.brand, item.model)}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-background"><ArrowUpRight size={16} aria-hidden /></a>}
                      <Button variant="secondary" onClick={() => void togglePublish(item)} disabled={!item.isActive}>{item.isPublished ? "Ocultar" : "Publicar"}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && totalItems > 0 && (
          <TablePagination
            label="vehículos del catálogo"
            page={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            itemsLabel="vehículos"
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            }}
          />
        )}
      </section>
      <p className="text-xs leading-5 text-muted">El precio de la página externa puede ser un precio de exhibición, no un FOB. Se conserva la etiqueta original de la fuente y no se mezclan ambos tipos de precio.</p>
    </div>
  );
}
