"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReceiptToken } from "@/features/fri/receipt-storage";
import { bookCalendarSlot, getCalendarSlots } from "./api";

function limaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function formatSlot(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function AppointmentBooker({ requestId }: { requestId: string }) {
  const minDate = useMemo(() => limaDate(new Date()), []);
  const maxDate = useMemo(() => limaDate(new Date(Date.now() + 60 * 86400000)), []);
  const [day, setDay] = useState(minDate);
  const [refreshKey, setRefreshKey] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookedAt, setBookedAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelected("");
    getCalendarSlots(day)
      .then((result) => {
        if (!active) return;
        setConnected(result.connected);
        setSlots(result.slots);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "No se pudieron consultar los horarios."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [day, refreshKey]);

  async function confirmBooking() {
    const token = getReceiptToken(requestId);
    if (!token || !selected) {
      setError("No encontramos el acceso privado de esta solicitud. Vuelve a abrir el enlace de confirmación original.");
      return;
    }
    setBooking(true);
    setError("");
    try {
      const result = await bookCalendarSlot(requestId, token, selected);
      setBookedAt(result.startsAt);
      setSelected("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo reservar la cita.");
      setRefreshKey((value) => value + 1);
    } finally {
      setBooking(false);
    }
  }

  return (
    <section aria-labelledby="appointment-title" className="mb-6 rounded-xl border border-accent-border bg-accent-soft p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary"><CalendarDays size={19} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="appointment-title" className="font-semibold text-navy">¿Quieres agendar una cita?</h2>
          <p className="mt-1 text-sm leading-6 text-navy">Elige un horario para conversar con el equipo TMB sobre tu solicitud. La reunión dura 30 minutos y se muestra en hora de Perú.</p>
        </div>
      </div>
      {bookedAt ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-sm text-green-900">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" aria-hidden />
          <div><p className="font-semibold">Cita agendada</p><p className="mt-1">{formatSlot(bookedAt)} · 30 minutos</p><p className="mt-1 text-xs">La cita quedó registrada en la agenda de TMB.</p></div>
        </div>
      ) : connected === false ? (
        <p role="status" className="mt-4 rounded-lg bg-white/80 p-3 text-sm text-muted">La agenda todavía no está habilitada. El equipo TMB podrá conectarla desde el panel.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(180px,240px)_1fr]">
          <label className="text-sm font-medium text-navy">Fecha
            <input type="date" min={minDate} max={maxDate} value={day} onChange={(event) => setDay(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm" />
            <span className="mt-1 block text-xs font-normal text-muted">Lunes a viernes, 9:00 a. m. a 5:00 p. m.</span>
          </label>
          <div>
            <p className="text-sm font-medium text-navy">Horarios disponibles</p>
            {loading ? <p role="status" className="mt-3 text-sm text-muted">Consultando disponibilidad…</p> : slots.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((slot) => <button type="button" key={slot} aria-pressed={selected === slot} onClick={() => setSelected(slot)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${selected === slot ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground hover:border-primary"}`}><Clock3 size={14} aria-hidden />{new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" }).format(new Date(slot))}</button>)}
              </div>
            ) : <p className="mt-3 text-sm text-muted">No hay horarios disponibles en esta fecha. Prueba otro día.</p>}
          </div>
          {error && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-white p-3 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-accent-border pt-4">
            <p className="text-xs text-muted">La disponibilidad se confirma al reservar.</p>
            <Button disabled={!selected || booking || loading} onClick={() => void confirmBooking()}>{booking ? "Agendando…" : "Confirmar cita"}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
