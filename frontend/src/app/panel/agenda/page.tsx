"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelAccess } from "@/features/panel/panel-access";
import { getCalendarAgenda, getGoogleConnectUrl, type AgendaData } from "@/features/calendar/api";

const dateTime = (value: string) => new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima", dateStyle: "full", timeStyle: "short",
}).format(new Date(value));

export default function AgendaPage() {
  const search = useSearchParams();
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const notice = search.get("calendar") === "connected" ? "Google Calendar quedó conectado. Ya puedes recibir citas desde el FRI." : "";
  const displayedError = error || search.get("calendar_error") || "";
  const refresh = useCallback(async () => {
    const result = await getCalendarAgenda();
    setData(result);
  }, []);

  useEffect(() => {
    let active = true;
    getCalendarAgenda().then((result) => active && setData(result))
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "No se pudo cargar la agenda."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  async function connect() {
    setConnecting(true);
    setError("");
    try {
      window.location.assign(await getGoogleConnectUrl());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar la conexión con Google.");
      setConnecting(false);
    }
  }

  return <PanelAccess>
    <div className="space-y-6">
      <PageHeader title="Agenda" eyebrow="Gestión comercial" description="Consulta las citas de tus clientes y la disponibilidad de tu equipo en Google Calendar." actions={<><Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => { setLoading(true); refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo actualizar la agenda.")).finally(() => setLoading(false)); }} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />Actualizar
          </Button>
          <Button className="flex-1 whitespace-nowrap sm:flex-none" onClick={() => void connect()} disabled={connecting}>
            <ExternalLink size={16} aria-hidden />{connecting ? "Conectando…" : data?.connection ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
          </Button></>} />

      {displayedError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{displayedError}</p>}
      {notice && <p role="status" className="rounded-lg border border-accent-border bg-accent-soft p-3 text-sm text-navy">{notice}</p>}

      <section className="flex flex-wrap items-center gap-4 tmb-card p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary"><CalendarDays size={22} aria-hidden /></span>
        <div>
          <p className="text-sm font-semibold text-navy">{loading && !data ? <Skeleton className="h-4 w-48" /> : data?.connection ? "Calendario conectado" : "Conecta la agenda de TMB"}</p>
          <p className="mt-1 text-sm text-muted">{loading && !data ? <Skeleton className="h-4 w-72 max-w-[65vw]" /> : data?.connection ? `${data.connection.google_email} · conectado el ${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(data.connection.connected_at))}` : "Usaremos tu Google Calendar principal para comprobar disponibilidad y guardar las reuniones."}</p>
        </div>
        {loading && !data ? <Skeleton className="ml-auto h-7 w-32" /> : !data?.connection && <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">Pendiente de conexión</span>}
      </section>

      <section className="overflow-hidden tmb-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="font-semibold text-navy">Citas agendadas</h2><p className="mt-1 text-xs text-muted">La hora se muestra en America/Lima</p></div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted">{data?.appointments.length ?? 0} citas</span>
        </div>
        {loading && !data ? <div role="status" aria-label="Cargando citas" aria-busy="true" className="divide-y divide-border"><span className="sr-only">Cargando citas</span>{Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-10 w-10" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-7 w-24" /></div>)}</div> : !data?.appointments.length ? (
          <div className="px-5 py-14 text-center">
            <CalendarDays size={28} className="mx-auto text-muted" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-navy">Todavía no hay citas</p>
            <p className="mt-1 text-sm text-muted">Cuando un cliente reserve desde la confirmación del FRI, aparecerá aquí.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.appointments.map((appointment) => <li key={appointment.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary"><Clock3 size={18} aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{dateTime(appointment.starts_at)}</p>
                <p className="mt-1 text-sm text-foreground">{appointment.client_name} <span className="text-muted">· {appointment.vehicle}</span></p>
                <p className="mt-1 text-xs text-muted">Solicitud {appointment.request_code} · 30 minutos</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800"><CheckCircle2 size={14} aria-hidden />Agendada</span>
            </li>)}
          </ul>
        )}
      </section>
    </div>
  </PanelAccess>;
}
