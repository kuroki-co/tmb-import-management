import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";

function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="space-y-5">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PanelAccessLoadingSkeleton() {
  return (
    <div role="status" aria-label="Verificando acceso al panel" aria-busy="true" className="tmb-card p-6">
      <span className="sr-only">Verificando acceso al panel</span>
      <div aria-hidden className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

export function RequestRowsLoadingSkeleton() {
  return (
    <div role="status" aria-label="Cargando filas de solicitudes" aria-busy="true" className="space-y-0">
      <span className="sr-only">Cargando filas de solicitudes</span>
      <div aria-hidden className="hidden overflow-x-auto md:block">
        <table className="tmb-data-table w-full text-left text-sm">
          <thead className="border-b border-border bg-white text-xs text-muted"><tr>{["Cliente", "Vehículo", "Presupuesto", "Recibida", "Estado"].map((label) => <th key={label} className="whitespace-nowrap px-5 py-3.5 font-semibold">{label}</th>)}</tr></thead>
          <tbody><TableRowsLoadingSkeleton cells={["person", "vehicle", "price", "date", "status"]} /></tbody>
        </table>
      </div>
      <div aria-hidden className="divide-y divide-border md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-3 p-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-full" /></div>
        ))}
      </div>
    </div>
  );
}

function HeadingSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-[80vw]" />
      </div>
      {action && <Skeleton className="h-11 w-36" />}
    </div>
  );
}

export function PanelLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true">
      <aside aria-hidden className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface p-6 lg:block">
        <Skeleton className="mx-auto h-12 w-32" />
        <div className="mt-7 space-y-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      </aside>
      <div className="lg:ml-64">
        <header aria-hidden className="flex h-16 items-center justify-between border-b border-border bg-white px-5 md:px-8">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-9 w-32" />
        </header>
        <main className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
          <LoadingRegion label="Cargando panel">
            <HeadingSkeleton action />
            <Skeleton className="h-72 w-full rounded-lg" />
          </LoadingRegion>
        </main>
      </div>
    </div>
  );
}

export function RequestsLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando solicitudes FRI">
      <HeadingSkeleton action />
      <div aria-hidden className="overflow-hidden tmb-card">
        <div className="flex gap-2 border-b border-border p-3">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-11 w-32" />)}
        </div>
        <div className="flex gap-3 border-b border-border p-4">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-36" />
        </div>
      </div>
      <div aria-hidden className="overflow-hidden tmb-card">
        <div className="border-b border-border p-4"><Skeleton className="h-4 w-52" /></div>
        <div className="hidden md:block">
          <div className="grid grid-cols-[1.4fr_1.2fr_.7fr_.7fr_.8fr] gap-5 border-b border-border bg-background px-5 py-3">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-3 w-20" />)}
          </div>
          {Array.from({ length: 5 }, (_, row) => (
            <div key={row} className="grid grid-cols-[1.4fr_1.2fr_.7fr_.7fr_.8fr] items-center gap-5 border-b border-border px-5 py-5 last:border-0">
              <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-28" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-border md:hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 p-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-full" /></div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando resumen comercial">
      <HeadingSkeleton action />
      <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="tmb-card p-5"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-8 w-20" /><Skeleton className="mt-3 h-3 w-36" /></div>)}</div>
      <div aria-hidden className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><div className="tmb-card p-5"><Skeleton className="mb-5 h-5 w-48" />{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-center gap-4 border-b border-border py-4 last:border-0"><Skeleton className="h-10 w-10" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-7 w-24" /></div>)}</div><div className="tmb-card p-5"><Skeleton className="mb-5 h-5 w-40" />{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex gap-3 border-b border-border py-4 last:border-0"><Skeleton className="h-10 w-10" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-32" /></div></div>)}</div></div>
      <div aria-hidden className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="tmb-card p-5"><Skeleton className="mb-6 h-5 w-44" /><Skeleton className="h-40 w-full" /></div>)}</div>
    </LoadingRegion>
  );
}

export function DetailLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando detalle de solicitud">
      <Skeleton className="h-4 w-40" />
      <div aria-hidden className="tmb-card p-5 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4"><div className="space-y-3"><Skeleton className="h-3 w-36" /><Skeleton className="h-8 w-72 max-w-[70vw]" /><Skeleton className="h-4 w-96 max-w-[70vw]" /></div><Skeleton className="h-10 w-32" /></div>
        <div className="grid gap-5 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-lg border border-border p-4"><Skeleton className="mb-4 h-3 w-28" /><Skeleton className="h-4 w-44" /></div>)}</div>
      </div>
    </LoadingRegion>
  );
}

export function QuotationLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando cotización">
      <div aria-hidden className="mb-6 flex items-start justify-between gap-4 tmb-card p-6"><div className="space-y-3"><Skeleton className="h-3 w-40" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-[70vw]" /><Skeleton className="h-8 w-80 max-w-[70vw]" /></div><Skeleton className="h-10 w-32" /></div>
      <div aria-hidden className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]"><div className="space-y-5">{Array.from({ length: 3 }, (_, index) => <div key={index} className="tmb-card p-6"><Skeleton className="mb-5 h-5 w-48" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, field) => <div key={field} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full" /></div>)}</div></div>)}</div><Skeleton className="h-[32rem] w-full rounded-xl" /></div>
    </LoadingRegion>
  );
}

export function CatalogLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando catálogo de vehículos">
      <HeadingSkeleton action />
      <div aria-hidden className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3 tmb-card p-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-36" /></div>)}</div>
      <div aria-hidden className="overflow-hidden tmb-card"><div className="flex justify-between border-b border-border p-5"><Skeleton className="h-5 w-44" /><Skeleton className="h-10 w-64" /></div>{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center justify-between gap-4 border-b border-border p-5 last:border-0"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div></div><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-24" /></div>)}</div>
    </LoadingRegion>
  );
}

type TableSkeletonCell = "person" | "vehicle" | "price" | "date" | "status" | "actions" | "text";

function TableSkeletonCellContent({ kind }: { kind: TableSkeletonCell }) {
  if (kind === "person" || kind === "vehicle") return <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 shrink-0 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-36 max-w-full" /><Skeleton className="h-3 w-24" /></div></div>;
  if (kind === "actions") return <div className="flex justify-end"><Skeleton className="h-10 w-24" /></div>;
  if (kind === "status") return <Skeleton className="h-7 w-24 rounded-full" />;
  if (kind === "date") return <Skeleton className="h-4 w-24" />;
  if (kind === "price") return <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div>;
  return <Skeleton className="h-4 w-28" />;
}

export function TableRowsLoadingSkeleton({ cells, rows = 5 }: { cells: readonly TableSkeletonCell[]; rows?: number }) {
  return <>{Array.from({ length: rows }, (_, index) => <tr key={index} aria-hidden="true" className="border-b border-border last:border-0">{cells.map((kind, cellIndex) => <td key={cellIndex} className="px-5 py-4"><TableSkeletonCellContent kind={kind} /></td>)}</tr>)}</>;
}

export function AgendaLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando agenda">
      <HeadingSkeleton action />
      <div aria-hidden className="flex items-center gap-4 tmb-card p-5"><Skeleton className="h-12 w-12 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-72 max-w-[65vw]" /></div></div>
      <div aria-hidden className="overflow-hidden tmb-card"><div className="border-b border-border p-5"><Skeleton className="h-5 w-40" /></div>{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-center gap-4 border-b border-border p-5 last:border-0"><Skeleton className="h-10 w-10" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-7 w-24" /></div>)}</div>
    </LoadingRegion>
  );
}

export function SettingsLoadingSkeleton({ withHeading = true }: { withHeading?: boolean } = {}) {
  return (
    <LoadingRegion label="Cargando configuración">
      {withHeading && <HeadingSkeleton />}
      {Array.from({ length: 2 }, (_, section) => <div aria-hidden key={section} className="tmb-card p-6"><Skeleton className="mb-6 h-5 w-48" /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-full" /></div>)}</div></div>)}
    </LoadingRegion>
  );
}

export function FriFormLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando formulario FRI">
      <div aria-hidden className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="tmb-card p-5 md:p-8"><div className="mb-8 grid grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="h-1 w-full" /><Skeleton className="h-3 w-16" /></div>)}</div><Skeleton className="mb-6 h-6 w-48" /><div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-11 w-full" /></div>)}</div><div className="mt-8 flex justify-between"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-32" /></div></div><div className="hidden h-72 tmb-card p-5 xl:block"><Skeleton className="h-5 w-40" /></div></div>
    </LoadingRegion>
  );
}

export function ReceiptLoadingSkeleton() {
  return (
    <LoadingRegion label="Preparando confirmación de solicitud">
      <div aria-hidden className="mx-auto max-w-5xl space-y-6 py-8"><Skeleton className="h-20 w-48" /><div className="tmb-card p-6"><Skeleton className="mb-4 h-8 w-72" /><Skeleton className="h-4 w-96 max-w-[80vw]" /><div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}</div><div className="mt-6 flex gap-3"><Skeleton className="h-11 w-40" /><Skeleton className="h-11 w-40" /></div></div></div>
    </LoadingRegion>
  );
}

export function LoginLoadingSkeleton() {
  return (
    <LoadingRegion label="Cargando acceso">
      <div aria-hidden className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center"><div className="w-full max-w-md space-y-5 tmb-card p-8"><Skeleton className="h-3 w-32" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 max-w-full" /><Skeleton className="mt-6 h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div></div>
    </LoadingRegion>
  );
}
