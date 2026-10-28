"use client";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  ArrowUpRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { listFri, type Fri } from "../api";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { TablePagination } from "@/components/ui/table-pagination";
import { StatusBadge } from "./status-badge";
export function RequestsList() {
  const [rows, setRows] = useState<Fri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  useEffect(() => {
    let active = true;
    listFri()
      .then((data) => {
        if (active) {
          setRows(data);
          setError("");
          setUpdatedAt(new Date());
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const filtered = rows
    .filter(
      (row) =>
        (!status || row.status === status) &&
        normalize(
          `${row.code} ${row.data.name} ${row.data.documentNumber} ${row.data.brand} ${row.data.model}`,
        ).includes(normalize(search)),
    )
    .sort((a, b) =>
      sort === "budget"
        ? b.data.budget - a.data.budget
        : sort === "oldest"
          ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
          : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-primary">
            GESTIÓN COMERCIAL
          </p>
          <h1 className="text-2xl font-semibold">Solicitudes FRI</h1>
          <p className="mt-2 text-sm text-muted">
            Revisa los requerimientos de importación recibidos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setPage(1);
              setLoading(true);
              setError("");
              setAttempt((v) => v + 1);
            }}
          >
            <RefreshCw
              size={16}
              className={
                loading ? "animate-spin motion-reduce:animate-none" : ""
              }
            />
            {loading ? "Actualizando…" : "Actualizar"}
          </Button>
          <Link
            href="/fri"
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowUpRight size={16} />
            Abrir formulario FRI
          </Link>
        </div>
      </div>
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-white">
        <div aria-label="Filtrar por estado" className="hidden flex-wrap gap-1 border-b border-border p-2 md:flex">
          {["Solicitudes recibidas", "Pendiente a revisar", "En revisión", "Cotizado"].map((label) => {
            const value = label === "Solicitudes recibidas" ? "" : label;
            const count = value ? rows.filter((row) => row.status === value).length : rows.length;
            return (
              <button
                key={label}
                type="button"
                aria-label={`Filtrar: ${label}`}
                aria-pressed={status === value}
                disabled={!updatedAt}
                onClick={() => {
                  setPage(1);
                  setStatus(value);
                }}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${status === value ? "bg-accent-soft font-semibold text-primary" : "text-muted hover:bg-background"}`}
              >
                {value || "Todas"}
                <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{updatedAt ? count : "—"}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3 md:grid-cols-[minmax(0,1fr)_11rem_auto]">
        <div className="relative order-1 col-span-2 min-w-0 md:col-span-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            aria-label="Buscar solicitudes"
            className={`${inputClass} py-2.5 pl-10`}
            placeholder="Código, cliente, documento o vehículo…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Select
          aria-label="Estado de solicitud"
          className={`${inputClass} order-2 col-span-2 min-h-11 min-w-0 py-2.5 md:hidden`}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Todos los estados</option>
          {(
            [
              "Pendiente a revisar",
              "En revisión",
              "Cotizado",
            ] satisfies Fri["status"][]
          ).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          aria-label="Ordenar solicitudes"
          className={`${inputClass} order-3 min-h-11 min-w-0 py-2.5`}
          value={sort}
          onChange={(event) => {
            setPage(1);
            setSort(event.target.value);
          }}
        >
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="budget">Mayor presupuesto</option>
        </Select>
          <button
            type="button"
            disabled={!search && !status && sort === "recent"}
            className="order-4 min-h-11 justify-self-end whitespace-nowrap rounded-lg px-3 text-sm font-medium text-primary enabled:hover:bg-background"
            onClick={() => {
              setPage(1);
              setSearch("");
              setStatus("");
              setSort("recent");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>
      <section className="overflow-hidden rounded-xl border border-border bg-white">
        {error && updatedAt && (
          <div
            role="alert"
            className="border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            No pudimos actualizar la bandeja. Conservamos los datos de la última
            carga.{" "}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setError("");
                setAttempt((value) => value + 1);
              }}
              className="ml-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}
        {error && !updatedAt ? (
          <div role="alert" className="p-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button
              className="mt-4"
              onClick={() => {
                setLoading(true);
                setAttempt((v) => v + 1);
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : loading && !updatedAt ? (
          <div role="status" className="space-y-4 p-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-12 animate-pulse rounded-lg bg-background motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-primary">
              <ClipboardList size={25} />
            </div>
            <h2 className="font-semibold">
              {rows.length
                ? "No encontramos coincidencias"
                : "Todo listo para tu primera solicitud"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              {rows.length
                ? "Prueba con otra búsqueda o cambia los filtros."
                : "Comparte el formulario público con tu cliente. Sus requerimientos aparecerán aquí al enviarlos."}
            </p>
            {rows.length ? (
              <Button
                className="mt-5"
                variant="secondary"
                onClick={() => {
                  setPage(1);
                  setSearch("");
                  setStatus("");
                }}
              >
                Mostrar todas las solicitudes
              </Button>
            ) : (
              <Link
                href="/fri"
                target="_blank"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Abrir formulario FRI
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {pageRows.map((row) => (
                <article key={row.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {row.code}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <h2 className="break-words text-base font-semibold">
                    {row.data.name}
                  </h2>
                  <p className="mt-2 text-sm">
                    {row.data.brand} {row.data.model} · {row.data.year}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
                    <span>USD {row.data.budget.toLocaleString("es-PE")}</span>
                    <span>
                      {new Date(row.createdAt).toLocaleDateString("es-PE")}
                    </span>
                  </div>
                  <Link
                    href={`/panel/solicitudes/${row.id}`}
                    className="mt-4 flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-semibold text-primary"
                  >
                    Ver solicitud →
                  </Link>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-[11px] text-muted">
                  <tr>
                    {[
                      "CLIENTE",
                      "VEHÍCULO",
                      "PRESUPUESTO",
                      "RECIBIDA",
                      "ESTADO",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-5 py-4 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-background/60"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/panel/solicitudes/${row.id}`}
                          className="font-semibold hover:text-primary hover:underline"
                        >
                          {row.data.name}
                        </Link>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {row.code}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {row.data.documentType} · {row.data.documentNumber}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p>
                          {row.data.brand} {row.data.model}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {row.data.year} · {row.data.quantity} unidad(es)
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        USD {row.data.budget.toLocaleString("es-PE")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted">
                        {new Date(row.createdAt).toLocaleDateString("es-PE")}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/panel/solicitudes/${row.id}`}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-xs font-semibold text-primary transition-colors hover:border-accent-border hover:bg-accent-soft focus-visible:outline-offset-2"
                        >
                          Ver detalle
                          <Eye size={14} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && filtered.length > 0 && (
          <TablePagination
            label="solicitudes FRI"
            page={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            }}
          />
        )}
        <div
          aria-live="polite"
          className={`flex flex-wrap justify-between gap-x-2 gap-y-1 px-4 py-2 text-[11px] text-muted ${!loading && filtered.length > 0 ? "" : "border-t border-border"}`}
        >
          <span>
            {updatedAt
              ? `${filtered.length} solicitud(es) en total`
              : "Sin datos cargados"}
          </span>
          {updatedAt && (
            <span>
              Última actualización:{" "}
              {updatedAt.toLocaleTimeString("es-PE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </section>
    </>
  );
}
