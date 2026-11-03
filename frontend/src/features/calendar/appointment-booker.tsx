"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getReceiptToken } from "@/features/fri/receipt-storage";
import { bookCalendarSlot, getCalendarBookingStatus, getCalendarSlots } from "./api";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarMonthDays,
  dateKeyToUtcDate,
  formatDateKey,
  isSameMonth,
  isWeekday,
  limaDateKey,
  monthKey,
  nextWeekday,
} from "./date-utils";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function formatSlot(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function limaHour(value: string) {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value)));
}

export function AppointmentBooker({ requestId }: { requestId: string }) {
  const [{ minDate, maxDate }] = useState(() => {
    const min = limaDateKey(new Date());
    return { minDate: min, maxDate: addCalendarDays(min, 60) };
  });
  const [day, setDay] = useState(() => nextWeekday(minDate));
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey(nextWeekday(minDate)));
  const [refreshKey, setRefreshKey] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<"checking" | "available" | "booked" | "error">("checking");
  const [appointment, setAppointment] = useState<{ startsAt: string; endsAt: string; status: "pending" | "confirmed" } | null>(null);
  const [bookingCheckKey, setBookingCheckKey] = useState(0);
  const [error, setError] = useState("");

  const calendarDays = useMemo(() => calendarMonthDays(visibleMonth), [visibleMonth]);
  const monthLabel = formatDateKey(`${visibleMonth}-01`, { month: "long", year: "numeric" });
  const previousMonth = addCalendarMonths(visibleMonth, -1);
  const nextMonth = addCalendarMonths(visibleMonth, 1);
  const canGoPrevious = previousMonth >= monthKey(minDate);
  const canGoNext = nextMonth <= monthKey(maxDate);
  const morningSlots = slots.filter((slot) => limaHour(slot) < 12);
  const afternoonSlots = slots.filter((slot) => limaHour(slot) >= 12);

  useEffect(() => {
    let active = true;
    const token = getReceiptToken(requestId);
    const bookingStatusRequest = token
      ? getCalendarBookingStatus(requestId, token)
      : Promise.reject(new Error("No encontramos el acceso privado de esta solicitud. Vuelve a abrir el enlace de confirmación original."));
    bookingStatusRequest
      .then((result) => {
        if (!active) return;
        setAppointment(result.appointment);
        setBookingStatus(result.appointment ? "booked" : "available");
        if (result.appointment) setLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudo consultar si esta solicitud ya tiene una cita.");
        setBookingStatus("error");
        setLoading(false);
      });
    return () => { active = false; };
  }, [requestId, bookingCheckKey]);

  useEffect(() => {
    if (bookingStatus !== "available") return;
    let active = true;
    getCalendarSlots(day)
      .then((result) => {
        if (!active) return;
        setConnected(result.connected);
        setSlots(result.slots);
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "No se pudieron consultar los horarios."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [bookingStatus, day, refreshKey]);

  function selectDay(dateKey: string) {
    if (dateKey === day) return;
    setLoading(true);
    setSlots([]);
    setSelected("");
    setError("");
    setDay(dateKey);
  }

  function retryBookingCheck() {
    setError("");
    setLoading(true);
    setBookingStatus("checking");
    setBookingCheckKey((value) => value + 1);
  }

  function changeMonth(targetMonth: string) {
    setVisibleMonth(targetMonth);
    const firstValidDay = calendarMonthDays(targetMonth).find((dateKey) =>
      isSameMonth(dateKey, targetMonth) && dateKey >= minDate && dateKey <= maxDate && isWeekday(dateKey),
    );
    if (firstValidDay) selectDay(firstValidDay);
  }

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
      setAppointment({ startsAt: result.startsAt, endsAt: result.endsAt, status: "confirmed" });
      setBookingStatus("booked");
      setSelected("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo reservar la cita.");
      setLoading(true);
      setSelected("");
      setRefreshKey((value) => value + 1);
    } finally {
      setBooking(false);
    }
  }

  return (
    <section aria-labelledby="appointment-title" className="mb-6 overflow-hidden rounded-xl border border-accent-border bg-accent-soft">
      <div className="flex items-start gap-3 border-b border-accent-border px-5 py-5 md:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary"><CalendarDays size={19} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="appointment-title" className="font-semibold text-navy">¿Quieres agendar una cita?</h2>
          <p className="mt-1 text-sm leading-6 text-navy">Elige una fecha y luego un horario para conversar con el equipo TMB. La reunión dura 30 minutos y se muestra en hora de Perú.</p>
        </div>
      </div>

      {bookingStatus === "booked" && appointment ? (
        <div role="status" className="m-5 flex items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-sm text-green-900 md:m-6">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" aria-hidden />
          <div><p className="font-semibold">Esta solicitud ya tiene una cita</p><p className="mt-1">{formatSlot(appointment.startsAt)} – {formatTime(appointment.endsAt)} · 30 minutos</p><p className="mt-1 text-xs">La cita quedó registrada en la agenda de TMB.</p></div>
        </div>
      ) : bookingStatus === "checking" ? (
        <div role="status" aria-label="Consultando cita existente" aria-busy="true" className="m-5 flex items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm text-muted md:m-6"><Skeleton className="h-9 w-9 rounded-full" />Comprobando si esta solicitud ya tiene una cita…</div>
      ) : bookingStatus === "error" ? (
        <div className="m-5 rounded-lg border border-red-200 bg-white p-4 md:m-6"><p role="alert" className="text-sm text-danger">{error || "No se pudo comprobar si esta solicitud ya tiene una cita."}</p><Button variant="secondary" className="mt-3" onClick={retryBookingCheck}>Reintentar</Button></div>
      ) : connected === false ? (
        <p role="status" className="m-5 rounded-lg bg-white/80 p-3 text-sm text-muted md:m-6">La agenda todavía no está habilitada. El equipo TMB podrá conectarla desde el panel.</p>
      ) : (
        <div className="grid gap-5 p-4 md:grid-cols-[minmax(260px,0.95fr)_minmax(300px,1.05fr)] md:gap-6 md:p-6">
          <div className="min-w-0 rounded-xl border border-border bg-white p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold capitalize text-navy">{monthLabel}</h3>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Mes anterior" disabled={!canGoPrevious} onClick={() => changeMonth(previousMonth)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-navy disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ChevronLeft size={18} aria-hidden /></button>
                <button type="button" aria-label="Mes siguiente" disabled={!canGoNext} onClick={() => changeMonth(nextMonth)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-navy disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ChevronRight size={18} aria-hidden /></button>
              </div>
            </div>
            <div role="group" aria-label={`Fechas disponibles en ${monthLabel}`} className="grid grid-cols-7 gap-y-1">
              {WEEKDAY_LABELS.map((label, index) => <span key={`${label}-${index}`} className="flex h-9 items-center justify-center text-xs font-medium text-muted">{label}</span>)}
              {calendarDays.map((dateKey) => {
                const inVisibleMonth = isSameMonth(dateKey, visibleMonth);
                const enabled = inVisibleMonth && dateKey >= minDate && dateKey <= maxDate && isWeekday(dateKey);
                const selectedDay = dateKey === day;
                const today = dateKey === minDate;
                return <button
                  key={dateKey}
                  type="button"
                  aria-label={formatDateKey(dateKey, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  aria-pressed={selectedDay}
                  disabled={!enabled}
                  onClick={() => selectDay(dateKey)}
                  className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selectedDay ? "bg-primary text-white shadow-sm" : enabled ? "text-foreground hover:bg-accent-soft" : "cursor-not-allowed text-muted/35"} ${today && !selectedDay ? "ring-1 ring-accent" : ""} ${!inVisibleMonth ? "invisible" : ""}`}
                >{dateKeyToUtcDate(dateKey).getUTCDate()}</button>;
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden />Lunes a viernes · próximas 8 semanas</div>
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Horarios disponibles</p>
                <h3 className="mt-1 text-base font-semibold capitalize text-navy">{formatDateKey(day, { weekday: "long", day: "numeric", month: "long" })}</h3>
              </div>
              {!loading && !error && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-muted">{slots.length} horarios</span>}
            </div>

            {loading ? (
              <div role="status" aria-label="Consultando disponibilidad" aria-busy="true" className="space-y-4"><span className="sr-only">Consultando disponibilidad</span>{[0, 1].map((group) => <div key={group}><Skeleton className="mb-2 h-3 w-20" /><div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-11 w-full rounded-lg" />)}</div></div>)}</div>
            ) : slots.length ? (
              <div className="space-y-4">
                {[
                  { title: "Mañana", range: "9:00 a. m. – 11:30 a. m.", items: morningSlots },
                  { title: "Tarde", range: "12:00 p. m. – 4:30 p. m.", items: afternoonSlots },
                ].filter((group) => group.items.length > 0).map((group) => (
                  <section key={group.title} aria-label={`Horarios de la ${group.title.toLowerCase()}`}>
                    <div className="mb-2 flex items-baseline justify-between gap-2"><p className="text-sm font-semibold text-foreground">{group.title}</p><p className="text-xs text-muted">{group.range}</p></div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((slot) => <button
                        type="button"
                        key={slot}
                        aria-pressed={selected === slot}
                        onClick={() => { setSelected(slot); setError(""); }}
                        className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected === slot ? "border-primary bg-primary text-white" : "border-border bg-white text-primary hover:border-accent hover:bg-accent-soft"}`}
                      ><span className="inline-flex items-center gap-2"><Clock3 size={15} aria-hidden />{formatTime(slot)}</span>{selected === slot && <Check size={16} aria-hidden />}</button>)}
                    </div>
                  </section>
                ))}
              </div>
            ) : error ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-white p-3 text-sm text-danger">{error}</p>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/70 px-5 py-7 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted"><CalendarDays size={18} aria-hidden /></span>
                <p className="mt-3 text-sm font-semibold text-navy">No hay horarios para esta fecha</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Prueba otro día. La agenda muestra los espacios libres del calendario de TMB.</p>
              </div>
            )}
            {error && slots.length > 0 && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-sm text-danger">{error}</p>}
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-accent-border pt-4">
            <p className="text-xs text-muted">La disponibilidad se confirma al reservar. Cada cita dura 30 minutos.</p>
            <Button disabled={!selected || booking || loading} onClick={() => void confirmBooking()}>{booking ? "Agendando…" : "Confirmar cita"}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
