"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { listFri, type Fri } from "../api";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Solicitudes recibidas",
            value: rows.length,
            icon: ClipboardList,
            hint: "Últimos 500 registros",
          },
          {
            label: "Pendiente a revisar",
            value: rows.filter((r) => r.status === "Pendiente a revisar")
              .length,
            icon: Clock3,
            hint: "Pendientes de revisión",
          },
          {
            label: "En revisión",
            value: rows.filter((r) => r.status === "En revisión").length,
            icon: CheckCircle2,
            hint: "Investigación en curso",
          },
          {
            label: "Cotizado",
            value: rows.filter((r) => r.status === "Cotizado").length,
            icon: ClipboardList,
            hint: "Cotización preparada",
          },
          {
            label: "Confirmado a compra",
            value: rows.filter((r) => r.status === "Confirmado a compra")
              .length,
            icon: CheckCircle2,
            hint: "Compra confirmada",
          },
        ].map(({ label, value, icon: Icon, hint }) => (
          <button
            key={label}
            type="button"
            aria-pressed={
              status === (label === "Solicitudes recibidas" ? "" : label)
            }
            aria-label={`Filtrar: ${label}`}
            onClick={() =>
              setStatus(label === "Solicitudes recibidas" ? "" : label)
            }
            disabled={!updatedAt}
            className={`rounded-xl border bg-white p-4 text-left transition-colors hover:border-primary motion-reduce:transition-none md:p-5 ${status === (label === "Solicitudes recibidas" ? "" : label) ? "border-primary ring-1 ring-primary/10" : "border-border"}`}
          >
            <div className="flex justify-between">
              <p className="text-xs font-medium text-muted">{label}</p>
              <span className="rounded-lg bg-blue-50 p-2 text-primary">
                <Icon size={17} />
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold">
              {!updatedAt ? "—" : value}
            </p>
            <p className="mt-2 text-xs text-muted">{hint}</p>
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-border bg-white p-4">
        <div className="relative min-w-52 flex-1">
          <Search size={17} className="absolute left-3 top-3 text-muted" />
          <input
            aria-label="Buscar solicitudes"
            className={`${inputClass} py-2.5 pl-10`}
            placeholder="Código, cliente, documento o vehículo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Estado de solicitud"
          className={`${inputClass} w-auto py-2.5`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {(
            [
              "Pendiente a revisar",
              "En revisión",
              "Cotizado",
              "Confirmado a compra",
            ] satisfies Fri["status"][]
          ).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Ordenar solicitudes"
          className={`${inputClass} w-auto py-2.5`}
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="budget">Mayor presupuesto</option>
        </select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch("");
            setStatus("");
            setSort("recent");
          }}
        >
          <SlidersHorizontal size={15} />
          Limpiar
        </Button>
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-primary">
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
              {filtered.map((row) => (
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
                  {filtered.map((row) => (
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
                          className="whitespace-nowrap text-xs font-semibold text-primary"
                        >
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div
          aria-live="polite"
          className="flex flex-wrap justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted"
        >
          <span>
            {updatedAt
              ? `${filtered.length} solicitud(es) mostradas`
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
