"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DashboardLoadingSkeleton } from "@/components/ui/loading-skeletons";
import { PanelAccess } from "@/features/panel/panel-access";
import { StatusBadge } from "@/features/fri/components/status-badge";
import { listFri, type Fri } from "@/features/fri/api";
import { getCalendarAgenda, type AgendaData } from "@/features/calendar/api";

type Appointment = AgendaData["appointments"][number];
type PeriodDays = 7 | 30 | 90;
const EMPTY_REQUESTS: Fri[] = [];
type DashboardData = {
  requests: Fri[];
  appointments: Appointment[];
  calendarState: "connected" | "disconnected" | "unavailable";
  fetchedAt: number;
};

async function loadDashboardData(): Promise<DashboardData> {
  const [requestsResult, agendaResult] = await Promise.allSettled([
    listFri(),
    getCalendarAgenda(),
  ]);
  if (requestsResult.status === "rejected") throw requestsResult.reason;
  if (agendaResult.status === "rejected") {
    return { requests: requestsResult.value, appointments: [], calendarState: "unavailable", fetchedAt: Date.now() };
  }
  return {
    requests: requestsResult.value,
    appointments: agendaResult.value.appointments,
    calendarState: agendaResult.value.connection ? "connected" : "disconnected",
    fetchedAt: Date.now(),
  };
}

function formatAppointment(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ageLabel(value: string, asOf: number) {
  const elapsedDays = Math.max(0, Math.floor((asOf - Date.parse(value)) / 86400000));
  if (elapsedDays === 0) return "Recibida hoy";
  if (elapsedDays === 1) return "Hace 1 día";
  return `Hace ${elapsedDays} días`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function SummaryCard({ label, value, detail, icon: Icon, tone = "accent", comparison }: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone?: "accent" | "warning" | "primary" | "success";
  comparison?: { difference: number; label: string };
}) {
  const toneClasses = {
    accent: "bg-accent-soft text-accent",
    warning: "bg-amber-50 text-amber-800",
    primary: "bg-primary/10 text-primary",
    success: "bg-success-soft text-success",
  }[tone];

  return (
    <article className="tmb-card relative overflow-hidden p-4 sm:p-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent via-brand-green to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted">{label}</p>
          <p className="mt-4 text-3xl font-semibold leading-none tracking-tight text-navy tabular-nums">{value.toLocaleString("es-PE")}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}><Icon size={19} aria-hidden /></span>
      </div>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-muted">{detail}</span>
        {comparison && <span className={`inline-flex items-center gap-0.5 font-medium ${comparison.difference === 0 ? "text-muted" : "text-accent"}`}>
          {comparison.difference > 0 ? <ArrowUpRight size={13} aria-hidden /> : comparison.difference < 0 ? <ArrowDownRight size={13} aria-hidden /> : null}
          {comparison.label}
        </span>}
      </div>
    </article>
  );
}

function PeriodPicker({ value, onChange }: { value: PeriodDays; onChange: (value: PeriodDays) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options: { days: PeriodDays; label: string }[] = [
    { days: 7, label: "Últimos 7 días" },
    { days: 30, label: "Últimos 30 días" },
    { days: 90, label: "Últimos 90 días" },
  ];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? "dashboard-period-options" : undefined}
        aria-label={`Período de los indicadores: últimos ${value} días`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-sm font-semibold text-navy shadow-[0_1px_2px_rgba(9,41,67,.04)] transition-colors hover:border-accent-border hover:bg-accent-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <CalendarDays size={16} aria-hidden className="text-accent" />
        <span>Últimos {value} días</span>
        <ChevronDown size={16} aria-hidden className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div id="dashboard-period-options" role="group" aria-label="Seleccionar período" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-white p-1.5 shadow-[0_16px_40px_rgba(9,41,67,.16)]">
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted">Período del resumen</p>
        {options.map((option) => <button
          key={option.days}
          type="button"
          aria-pressed={value === option.days}
          onClick={() => {
            onChange(option.days);
            setOpen(false);
          }}
          className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition-colors ${value === option.days ? "bg-accent-soft font-semibold text-accent" : "text-foreground hover:bg-background"}`}
        >
          <span>{option.label}</span>
          {value === option.days && <Check size={16} aria-hidden />}
        </button>)}
      </div>}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "reviewing">("all");

  useEffect(() => {
    let active = true;
    loadDashboardData()
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el resumen."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      setData(await loadDashboardData());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el resumen.");
    } finally {
      setRefreshing(false);
    }
  }

  const requests = data?.requests ?? EMPTY_REQUESTS;
  const asOf = data?.fetchedAt ?? 0;
  const metrics = useMemo(() => {
    const today = startOfDay(new Date(asOf));
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - periodDays + 1);
    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - periodDays);
    const currentEnd = new Date(today);
    currentEnd.setDate(today.getDate() + 1);
    const createdDuring = (request: Fri, from: Date, until: Date) => {
      const timestamp = Date.parse(request.createdAt);
      return timestamp >= from.getTime() && timestamp < until.getTime();
    };
    const requestsInPeriod = requests.filter((request) => createdDuring(request, currentStart, currentEnd));
    const receivedInPeriod = requestsInPeriod.length;
    const receivedPreviousPeriod = requests.filter((request) => createdDuring(request, previousStart, currentStart)).length;
    return {
      receivedInPeriod,
      receivedPreviousPeriod,
      pending: requestsInPeriod.filter((request) => request.status === "Pendiente a revisar").length,
      reviewing: requestsInPeriod.filter((request) => request.status === "En revisión").length,
      quoted: requestsInPeriod.filter((request) => request.status === "Cotizado").length,
    };
  }, [asOf, periodDays, requests]);

  const attentionRequests = useMemo(() => requests
    .filter((request) => request.status === "Pendiente a revisar" || request.status === "En revisión")
    .sort((a, b) => {
      const stageOrder = (a.status === "Pendiente a revisar" ? 0 : 1) - (b.status === "Pendiente a revisar" ? 0 : 1);
      return stageOrder || Date.parse(a.createdAt) - Date.parse(b.createdAt);
    }), [requests]);
  const visibleAttentionRequests = useMemo(() => attentionRequests.filter((request) => {
    if (queueFilter === "pending") return request.status === "Pendiente a revisar";
    if (queueFilter === "reviewing") return request.status === "En revisión";
    return true;
  }), [attentionRequests, queueFilter]);

  const upcomingAppointments = useMemo(() => (data?.appointments ?? [])
    .filter((appointment) => Date.parse(appointment.starts_at) >= asOf)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, 4), [asOf, data?.appointments]);
  const receivedDelta = metrics.receivedInPeriod - metrics.receivedPreviousPeriod;
  const periodLabel = periodDays === 7 ? "últimos 7 días" : periodDays === 30 ? "últimos 30 días" : "últimos 90 días";

  return (
    <PanelAccess>
      <div className="space-y-6">
        <PageHeader title="Hola, equipo TMB" eyebrow="Gestión comercial" description="El panorama de tus operaciones y las solicitudes que necesitan tu atención." actions={<>
            <PeriodPicker value={periodDays} onChange={setPeriodDays} />
            <Button variant="secondary" onClick={() => void refresh()} disabled={loading || refreshing}>
              {refreshing ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
              {refreshing ? "Actualizando…" : "Actualizar"}
            </Button>
            <Link href="/panel/solicitudes" className="inline-flex min-h-11 sm:min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"><ClipboardList size={16} aria-hidden />Abrir solicitudes</Link>
        </>} />

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"><span>{error}</span><Button variant="secondary" onClick={() => void refresh()} disabled={refreshing}>Reintentar</Button></div>}

        {loading && !data ? (
          <DashboardLoadingSkeleton />
        ) : data ? (
          <>
            <p className="-mb-3 text-xs text-muted">Indicadores de FRI recibidas en el período seleccionado.</p>
            <section aria-label="Resumen comercial" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <SummaryCard
                label="FRI recibidas"
                value={metrics.receivedInPeriod}
                detail={periodLabel}
                icon={ClipboardList}
                tone="accent"
                comparison={{
                  difference: receivedDelta,
                  label: receivedDelta === 0 ? "igual al período anterior" : `${Math.abs(receivedDelta)} ${receivedDelta > 0 ? "más" : "menos"} vs. período anterior`,
                }}
              />
              <SummaryCard label="Por revisar" value={metrics.pending} detail="Esperan primera revisión" icon={Clock3} tone="warning" />
              <SummaryCard label="En revisión" value={metrics.reviewing} detail="En evaluación comercial" icon={Search} tone="primary" />
              <SummaryCard label="Cotizadas" value={metrics.quoted} detail="Con propuesta preparada" icon={FileCheck2} tone="success" />
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,1fr)]">
              <div className="overflow-hidden tmb-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div><h2 className="font-semibold text-navy">Solicitudes por atender</h2><p className="mt-1 text-xs text-muted">Pendientes primero; después, las más antiguas en revisión.</p></div>
                  <Link href="/panel/solicitudes" aria-label="Ver todas las solicitudes" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-background"><ArrowRight size={17} aria-hidden /></Link>
                </div>
                <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3" role="group" aria-label="Filtrar solicitudes por estado">
                  {([
                    ["all", "Todas"],
                    ["pending", "Por revisar"],
                    ["reviewing", "En revisión"],
                  ] as const).map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={queueFilter === filter}
                      onClick={() => setQueueFilter(filter)}
                      className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${queueFilter === filter ? "bg-accent-soft text-accent" : "text-muted hover:bg-background hover:text-navy"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {visibleAttentionRequests.length ? (
                  <ul className="divide-y divide-border">
                    {visibleAttentionRequests.slice(0, 5).map((request) => <li key={request.id}>
                      <Link href={`/panel/solicitudes/${request.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${request.status === "Pendiente a revisar" ? "bg-amber-50 text-amber-800" : "bg-accent-soft text-accent"}`}><CarFront size={18} aria-hidden /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-navy">{request.data.name}</span><span className="mt-1 block truncate text-xs text-muted">{request.code} · {request.data.brand} {request.data.model}</span></span>
                        <span className="text-xs text-muted">{ageLabel(request.createdAt, asOf)}</span>
                        <StatusBadge status={request.status} />
                      </Link>
                    </li>)}
                  </ul>
                ) : (
                  <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success"><ClipboardList size={20} aria-hidden /></span><p className="mt-3 text-sm font-semibold text-navy">{queueFilter === "pending" ? "Nada por revisar" : queueFilter === "reviewing" ? "Sin solicitudes en revisión" : "Todo está al día"}</p><p className="mt-1 text-sm text-muted">{queueFilter === "all" ? "No hay solicitudes pendientes de atención." : "No hay solicitudes en este estado."}</p></div>
                )}
              </div>

              <div className="overflow-hidden tmb-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold text-navy">Próximas citas</h2><p className="mt-1 text-xs text-muted">Reuniones con clientes, en hora de Perú.</p></div><Link href="/panel/agenda" aria-label="Ver agenda" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-background"><CalendarDays size={18} aria-hidden /></Link></div>
                {upcomingAppointments.length ? <ul className="divide-y divide-border">{upcomingAppointments.map((appointment) => <li key={appointment.id} className="flex items-start gap-3 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><CalendarDays size={18} aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-navy">{appointment.client_name}</span><span className="mt-1 block truncate text-xs text-muted">{appointment.request_code} · {appointment.vehicle}</span><span className="mt-2 block text-xs font-medium text-accent">{formatAppointment(appointment.starts_at)}</span></span><span className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold ${appointment.status === "confirmed" ? "bg-success-soft text-success" : "bg-amber-50 text-amber-800"}`}>{appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}</span></li>)}</ul>
                  : <div className="px-5 py-9 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-background text-muted"><CalendarDays size={19} aria-hidden /></span><p className="mt-3 text-sm font-semibold text-navy">{data.calendarState === "disconnected" ? "Agenda sin conectar" : data.calendarState === "unavailable" ? "Agenda no disponible" : "Sin citas próximas"}</p><p className="mt-1 text-xs leading-5 text-muted">{data.calendarState === "disconnected" ? "Conecta Google Calendar para ver las reuniones aquí." : data.calendarState === "unavailable" ? "No pudimos consultar las citas. Puedes revisar la agenda directamente." : "Las próximas reuniones aparecerán aquí."}</p>{data.calendarState !== "connected" && <Link href="/panel/agenda" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-background">Abrir agenda<ArrowRight size={14} aria-hidden /></Link>}</div>}
              </div>
            </section>

          </>
        ) : null}
      </div>
    </PanelAccess>
  );
}
