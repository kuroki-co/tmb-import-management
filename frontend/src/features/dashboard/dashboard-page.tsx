"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function getRequestTrend(requests: Fri[], periodDays: PeriodDays, asOf: number) {
  const start = startOfDay(new Date(asOf));
  start.setDate(start.getDate() - periodDays + 1);
  const bucketCount = periodDays === 7 ? 7 : periodDays === 30 ? 6 : 12;
  const bucketWidth = periodDays / bucketCount;
  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + Math.floor(index * bucketWidth));
    const bucketEnd = new Date(start);
    bucketEnd.setDate(start.getDate() + Math.floor((index + 1) * bucketWidth));
    const count = requests.filter((request) => {
      const createdAt = Date.parse(request.createdAt);
      return createdAt >= bucketStart.getTime() && createdAt < bucketEnd.getTime();
    }).length;
    return {
      label: new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(bucketStart),
      count,
    };
  });
}

function MetricCard({ label, value, detail, icon: Icon, tone = "default", comparison }: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success";
  comparison?: { difference: number; label: string };
}) {
  const toneClasses = tone === "warning"
    ? "bg-amber-50 text-amber-800"
    : tone === "success"
      ? "bg-success-soft text-success"
      : "bg-accent-soft text-accent";
  const numericValue = typeof value === "number" ? value.toLocaleString("es-PE") : value;
  return (
    <article className="relative overflow-hidden tmb-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-h-8 text-xs font-medium text-muted sm:min-h-10 sm:text-sm">{label}</p>
        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${toneClasses}`}><Icon size={19} aria-hidden /></span>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold leading-none tracking-tight text-navy tabular-nums">{numericValue}</p>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-muted">{detail}</span>
        {comparison && <span className={`inline-flex items-center gap-0.5 font-medium ${comparison.difference === 0 ? "text-muted" : "text-accent"}`}>
          {comparison.difference > 0 ? <ArrowUpRight size={13} aria-hidden /> : comparison.difference < 0 ? <ArrowDownRight size={13} aria-hidden /> : null}{comparison.label}
        </span>}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

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
    const receivedInPeriod = requests.filter((request) => createdDuring(request, currentStart, currentEnd)).length;
    const receivedPreviousPeriod = requests.filter((request) => createdDuring(request, previousStart, currentStart)).length;
    const nextWeekEnd = asOf + 7 * 86400000;
    return {
      receivedInPeriod,
      receivedPreviousPeriod,
      pending: requests.filter((request) => request.status === "Pendiente a revisar").length,
      reviewing: requests.filter((request) => request.status === "En revisión").length,
      quoted: requests.filter((request) => request.status === "Cotizado").length,
      confirmed: requests.filter((request) => request.status === "Confirmado a compra").length,
      appointmentsNextWeek: (data?.appointments ?? []).filter((appointment) => {
        const start = Date.parse(appointment.starts_at);
        return start >= asOf && start < nextWeekEnd;
      }).length,
    };
  }, [asOf, data?.appointments, periodDays, requests]);

  const attentionRequests = useMemo(() => requests
    .filter((request) => request.status === "Pendiente a revisar" || request.status === "En revisión")
    .sort((a, b) => {
      const stageOrder = (a.status === "Pendiente a revisar" ? 0 : 1) - (b.status === "Pendiente a revisar" ? 0 : 1);
      return stageOrder || Date.parse(a.createdAt) - Date.parse(b.createdAt);
    })
    .slice(0, 5), [requests]);

  const trend = useMemo(() => getRequestTrend(requests, periodDays, asOf), [asOf, periodDays, requests]);
  const upcomingAppointments = useMemo(() => (data?.appointments ?? [])
    .filter((appointment) => Date.parse(appointment.starts_at) >= asOf)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, 4), [asOf, data?.appointments]);
  const receivedDelta = metrics.receivedInPeriod - metrics.receivedPreviousPeriod;
  const periodLabel = periodDays === 7 ? "últimos 7 días" : periodDays === 30 ? "últimos 30 días" : "últimos 90 días";
  const stages = [
    { key: "pending", label: "Pendiente a revisar", count: metrics.pending, color: "bg-amber-400", chartColor: "#d9a323" },
    { key: "reviewing", label: "En revisión", count: metrics.reviewing, color: "bg-accent", chartColor: "#087b82" },
    { key: "quoted", label: "Cotizado", count: metrics.quoted, color: "bg-primary", chartColor: "#12385b" },
    { key: "confirmed", label: "Confirmado a compra", count: metrics.confirmed, color: "bg-success", chartColor: "#23633b" },
  ];
  const pipelineData = [{
    label: "Solicitudes",
    pending: metrics.pending,
    reviewing: metrics.reviewing,
    quoted: metrics.quoted,
    confirmed: metrics.confirmed,
  }];

  return (
    <PanelAccess>
      <div className="space-y-6">
        <PageHeader title="Hola, equipo TMB" eyebrow="Gestión comercial" description="El panorama de tus operaciones y las solicitudes que necesitan tu atención." actions={<>
<label className="flex min-h-11 items-center gap-2 tmb-card px-3 text-xs font-medium text-muted">
              Período
              <select aria-label="Período del resumen" className="tmb-select min-h-9 bg-transparent pr-6 text-sm font-medium text-navy" value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value) as PeriodDays)}>
                <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option>
              </select>
            </label>
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
            <section aria-label="Indicadores comerciales" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <MetricCard label="Solicitudes nuevas" value={metrics.receivedInPeriod} detail={periodLabel} icon={ClipboardList} comparison={{ difference: receivedDelta, label: receivedDelta === 0 ? "igual al período anterior" : `${Math.abs(receivedDelta)} ${receivedDelta > 0 ? "más" : "menos"} que el período anterior` }} />
              <MetricCard label="Pendientes de revisar" value={metrics.pending} detail="Esperan una primera revisión" icon={Clock3} tone="warning" />
              <MetricCard label="En revisión" value={metrics.reviewing} detail="Solicitudes en evaluación" icon={Search} />
              <MetricCard label="Citas próximas" value={data.calendarState === "connected" ? metrics.appointmentsNextWeek : "—"} detail={data.calendarState === "connected" ? "En los próximos 7 días" : data.calendarState === "disconnected" ? "Conecta la agenda para ver citas" : "Agenda no disponible"} icon={CalendarDays} />
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,1fr)]">
              <div className="overflow-hidden tmb-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div><h2 className="font-semibold text-navy">Solicitudes por atender</h2><p className="mt-1 text-xs text-muted">Pendientes primero; dentro de cada etapa, las más antiguas.</p></div>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">{attentionRequests.length} por atender</span><Link href="/panel/solicitudes" aria-label="Ver todas las solicitudes" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-background"><ArrowRight size={17} aria-hidden /></Link></div>
                </div>
                {attentionRequests.length ? (
                  <ul className="divide-y divide-border">
                    {attentionRequests.map((request) => <li key={request.id}>
                      <Link href={`/panel/solicitudes/${request.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-background/60 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-accent">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${request.status === "Pendiente a revisar" ? "bg-amber-50 text-amber-800" : "bg-accent-soft text-accent"}`}><CarFront size={18} aria-hidden /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-navy">{request.data.name}</span><span className="mt-1 block truncate text-xs text-muted">{request.code} · {request.data.brand} {request.data.model}</span></span>
                        <span className="text-xs text-muted">{ageLabel(request.createdAt, asOf)}</span>
                        <StatusBadge status={request.status} />
                      </Link>
                    </li>)}
                  </ul>
                ) : (
                  <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success"><ClipboardList size={20} aria-hidden /></span><p className="mt-3 text-sm font-semibold text-navy">Todo está al día</p><p className="mt-1 text-sm text-muted">No hay solicitudes pendientes de atención.</p></div>
                )}
              </div>

              <div className="overflow-hidden tmb-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-semibold text-navy">Próximas citas</h2><p className="mt-1 text-xs text-muted">Reuniones con clientes, en hora de Perú.</p></div><Link href="/panel/agenda" aria-label="Ver agenda" className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-background"><CalendarDays size={18} aria-hidden /></Link></div>
                {upcomingAppointments.length ? <ul className="divide-y divide-border">{upcomingAppointments.map((appointment) => <li key={appointment.id} className="flex items-start gap-3 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><CalendarDays size={18} aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-navy">{appointment.client_name}</span><span className="mt-1 block truncate text-xs text-muted">{appointment.request_code} · {appointment.vehicle}</span><span className="mt-2 block text-xs font-medium text-accent">{formatAppointment(appointment.starts_at)}</span></span><span className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold ${appointment.status === "confirmed" ? "bg-success-soft text-success" : "bg-amber-50 text-amber-800"}`}>{appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}</span></li>)}</ul>
                  : <div className="px-5 py-9 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-background text-muted"><CalendarDays size={19} aria-hidden /></span><p className="mt-3 text-sm font-semibold text-navy">{data.calendarState === "disconnected" ? "Agenda sin conectar" : data.calendarState === "unavailable" ? "Agenda no disponible" : "Sin citas próximas"}</p><p className="mt-1 text-xs leading-5 text-muted">{data.calendarState === "disconnected" ? "Conecta Google Calendar para ver las reuniones aquí." : data.calendarState === "unavailable" ? "No pudimos consultar las citas. Puedes revisar la agenda directamente." : "Las próximas reuniones aparecerán aquí."}</p>{data.calendarState !== "connected" && <Link href="/panel/agenda" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-background">Abrir agenda<ArrowRight size={14} aria-hidden /></Link>}</div>}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
              <div className="tmb-card p-5 md:p-6">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div><h2 className="font-semibold text-navy">Estado de solicitudes</h2><p className="mt-1 text-xs text-muted">Solicitudes abiertas y compras confirmadas.</p></div>
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold tabular-nums text-muted">{requests.length} total</span>
                </div>
                <div role="img" aria-label={stages.map((stage) => `${stage.label}: ${stage.count}`).join(", ")} className="h-14 w-full rounded-lg bg-background/70 px-1">
                  {requests.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} layout="vertical" margin={{ top: 14, right: 2, bottom: 14, left: 2 }} barSize={22}>
                      <XAxis type="number" domain={[0, requests.length]} hide />
                      <YAxis type="category" dataKey="label" hide />
                      <Tooltip
                        cursor={{ fill: "rgba(8, 123, 130, .06)" }}
                        formatter={(value, name) => [`${value} solicitud${Number(value) === 1 ? "" : "es"}`, String(name)]}
                        contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(9, 41, 67, .12)", fontSize: 12 }}
                      />
                      {stages.map((stage, index) => <Bar
                        key={stage.key}
                        dataKey={stage.key}
                        name={stage.label}
                        stackId="pipeline"
                        fill={stage.chartColor}
                        radius={index === 0 ? [7, 0, 0, 7] : index === stages.length - 1 ? [0, 7, 7, 0] : 0}
                        isAnimationActive="auto"
                        animationDuration={550}
                      />)}
                    </BarChart>
                  </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs text-muted">Sin solicitudes todavía</div>}
                </div>
                <ul className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-1">
                  {stages.map((stage) => <li key={stage.label} className="flex items-center gap-3">
                    <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.color}`} />
                    <span className="min-w-0 flex-1 text-sm text-foreground">{stage.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-navy">{stage.count}</span>
                  </li>)}
                </ul>
                <Link href="/panel/solicitudes" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-primary transition-colors hover:bg-background">Ir a solicitudes<ArrowRight size={15} aria-hidden /></Link>
              </div>

              <div className="tmb-card p-5 md:p-6">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-semibold text-navy">Entrada de solicitudes</h2><p className="mt-1 text-xs text-muted">Tendencia en los {periodLabel}.</p></div>
                  <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-semibold tabular-nums text-accent">{metrics.receivedInPeriod} FRI</span>
                </div>
                <div role="img" aria-label={trend.map((bucket) => `${bucket.label}: ${bucket.count} solicitudes`).join(", ")} className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashboard-request-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#087b82" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#087b82" stopOpacity={0.015} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 5" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickMargin={12} minTickGap={20} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 10 }} width={30} />
                      <Tooltip
                        cursor={{ stroke: "#087b82", strokeDasharray: "4 4", strokeWidth: 1 }}
                        formatter={(value) => [`${value} solicitud${Number(value) === 1 ? "" : "es"}`, "Recibidas"]}
                        contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(9, 41, 67, .12)", padding: "10px 12px", fontSize: 12 }}
                        labelStyle={{ color: "var(--color-navy)", fontWeight: 600, marginBottom: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Solicitudes recibidas"
                        stroke="#087b82"
                        strokeWidth={2.5}
                        fill="url(#dashboard-request-fill)"
                        activeDot={{ r: 5, fill: "#70bf44", stroke: "#fff", strokeWidth: 2 }}
                        dot={false}
                        isAnimationActive="auto"
                        animationDuration={650}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {metrics.receivedInPeriod === 0 && <p className="mt-4 rounded-lg bg-background px-3 py-2 text-xs text-muted">No hubo solicitudes nuevas en este período.</p>}
                <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted"><LayoutDashboard size={14} className="text-accent" aria-hidden />{receivedDelta > 0 ? `${receivedDelta} más` : receivedDelta < 0 ? `${Math.abs(receivedDelta)} menos` : "El mismo número"} que en el período anterior.</p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PanelAccess>
  );
}
