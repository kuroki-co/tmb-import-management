"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [notice, setNotice] = useState("");
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
  useEffect(() => {
    if (search.get("calendar") === "connected") setNotice("Google Calendar quedó conectado. Ya puedes recibir citas desde el FRI.");
    const issue = search.get("calendar_error");
    if (issue) setError(issue);
  }, [search]);

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
      <header className="flex w-full min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Gestión comercial</p>
          <h1 className="mt-2 text-2xl font-semibold text-navy">Agenda</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Consulta las citas que los clientes agendan al enviar su FRI. La disponibilidad se sincroniza con Google Calendar.</p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => { setLoading(true); refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo actualizar la agenda.")).finally(() => setLoading(false)); }} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />Actualizar
          </Button>
          <Button className="flex-1 whitespace-nowrap sm:flex-none" onClick={() => void connect()} disabled={connecting}>
            <ExternalLink size={16} aria-hidden />{connecting ? "Conectando…" : data?.connection ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
          </Button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-accent-border bg-accent-soft p-3 text-sm text-navy">{notice}</p>}

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary"><CalendarDays size={22} aria-hidden /></span>
        <div>
          <p className="text-sm font-semibold text-navy">{data?.connection ? "Calendario conectado" : "Conecta la agenda de TMB"}</p>
          <p className="mt-1 text-sm text-muted">{data?.connection ? `${data.connection.google_email} · conectado el ${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(data.connection.connected_at))}` : "Usaremos tu Google Calendar principal para comprobar disponibilidad y guardar las reuniones."}</p>
        </div>
        {!data?.connection && <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">Pendiente de conexión</span>}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="font-semibold text-navy">Citas agendadas</h2><p className="mt-1 text-xs text-muted">La hora se muestra en America/Lima</p></div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted">{data?.appointments.length ?? 0} citas</span>
        </div>
        {loading ? <p role="status" className="p-8 text-center text-sm text-muted">Cargando citas…</p> : !data?.appointments.length ? (
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
