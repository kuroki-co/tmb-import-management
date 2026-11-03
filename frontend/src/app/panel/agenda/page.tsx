"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelAccess } from "@/features/panel/panel-access";
import { getCalendarAgenda, getGoogleConnectUrl, type AgendaData } from "@/features/calendar/api";
import { AppointmentMonthCalendar } from "@/features/calendar/appointment-month-calendar";

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

      {loading && !data ? (
        <section role="status" aria-label="Cargando calendario" aria-busy="true" className="grid overflow-hidden rounded-xl border border-border bg-white xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div aria-hidden className="space-y-5 p-5 md:p-6"><div className="flex justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-28" /></div><div className="grid grid-cols-7 gap-2">{Array.from({ length: 42 }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}</div></div>
          <div aria-hidden className="border-t border-border p-5 xl:border-l xl:border-t-0"><Skeleton className="mb-5 h-5 w-36" />{Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="mb-3 h-28 w-full rounded-xl" />)}</div>
        </section>
      ) : data ? <AppointmentMonthCalendar appointments={data.appointments} /> : null}
    </div>
  </PanelAccess>;
}
