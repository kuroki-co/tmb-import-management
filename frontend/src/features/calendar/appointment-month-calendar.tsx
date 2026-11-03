"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import type { AgendaData } from "./api";
import {
  addCalendarMonths,
  calendarMonthDays,
  dateKeyFromInstant,
  dateKeyToUtcDate,
  formatDateKey,
  isSameMonth,
  limaDateKey,
  monthKey,
  monthStartKey,
} from "./date-utils";

type Appointment = AgendaData["appointments"][number];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AppointmentMonthCalendar({ appointments }: { appointments: Appointment[] }) {
  const today = limaDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const days = useMemo(() => calendarMonthDays(visibleMonth), [visibleMonth]);
  const monthAppointments = useMemo(() => appointments.filter((appointment) =>
    monthKey(dateKeyFromInstant(appointment.starts_at)) === visibleMonth,
  ), [appointments, visibleMonth]);
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const date = dateKeyFromInstant(appointment.starts_at);
      grouped.set(date, [...(grouped.get(date) || []), appointment]);
    }
    return grouped;
  }, [appointments]);
  const selectedAppointments = appointmentsByDate.get(selectedDate) || [];
  const monthLabel = formatDateKey(monthStartKey(visibleMonth), { month: "long", year: "numeric" });

  function changeMonth(amount: number) {
    const target = addCalendarMonths(visibleMonth, amount);
    setVisibleMonth(target);
    setSelectedDate(monthStartKey(target));
  }

  function goToToday() {
    setVisibleMonth(monthKey(today));
    setSelectedDate(today);
  }

  return (
    <section className="overflow-hidden tmb-card" aria-label="Calendario de citas">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold capitalize text-navy">{monthLabel}</h2>
              <p className="mt-1 text-xs text-muted">{monthAppointments.length} {monthAppointments.length === 1 ? "cita" : "citas"} este mes</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={goToToday} className="mr-1 min-h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Hoy</button>
              <button type="button" aria-label="Mes anterior" onClick={() => changeMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ChevronLeft size={18} aria-hidden /></button>
              <button type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ChevronRight size={18} aria-hidden /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border pb-2" role="row">
            {WEEKDAYS.map((label) => <div key={label} role="columnheader" className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">{label}</div>)}
          </div>
          <div role="grid" aria-label={`Calendario de ${monthLabel}`} className="grid grid-cols-7">
            {days.map((date) => {
              const inMonth = isSameMonth(date, visibleMonth);
              const dayAppointments = appointmentsByDate.get(date) || [];
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const details = dayAppointments.map((appointment) => `${timeLabel(appointment.starts_at)} ${appointment.client_name}`).join(", ");
              return <div key={date} role="gridcell" className={`min-w-0 border-b border-r border-border p-1 last:border-r-0 sm:p-1.5 ${inMonth ? "bg-white" : "bg-background/60"}`}>
                {inMonth ? <button
                  type="button"
                  aria-label={`${formatDateKey(date, { weekday: "long", day: "numeric", month: "long" })}${dayAppointments.length ? `. ${dayAppointments.length} citas: ${details}` : ". Sin citas"}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(date)}
                  className={`group flex min-h-[4.5rem] w-full flex-col items-stretch rounded-lg p-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:min-h-[6.4rem] sm:p-2 ${isSelected ? "bg-accent-soft ring-1 ring-accent" : "hover:bg-background"}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${isToday ? "bg-primary text-white" : isSelected ? "text-accent" : "text-foreground"}`}>{dateKeyToUtcDate(date).getUTCDate()}</span>
                  {dayAppointments.length > 0 && <span className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="truncate text-[10px] font-medium text-accent sm:hidden">{dayAppointments.length} cita{dayAppointments.length === 1 ? "" : "s"}</span>
                    <span className="hidden min-w-0 truncate text-[10px] font-medium text-foreground sm:block">{timeLabel(dayAppointments[0].starts_at)} · {dayAppointments[0].client_name}</span>
                  </span>}
                  {dayAppointments.length > 1 && <span className="hidden pl-3 text-left text-[10px] text-muted sm:block">+{dayAppointments.length - 1} más</span>}
                </button> : <div aria-hidden className="min-h-[4.5rem] sm:min-h-[6.4rem]" />}
              </div>;
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden />Día con citas</div>
        </div>

        <aside className="border-t border-border bg-background/60 p-4 md:p-6 xl:border-l xl:border-t-0" aria-live="polite">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Agenda del día</p>
              <h3 className="mt-1 text-base font-semibold capitalize text-navy">{formatDateKey(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</h3>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-muted">{selectedAppointments.length}</span>
          </div>

          {selectedAppointments.length ? <ul className="space-y-3">
            {selectedAppointments.map((appointment) => <li key={appointment.id} className="rounded-xl border border-border bg-white p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Clock3 size={17} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums text-navy">{timeLabel(appointment.starts_at)} – {timeLabel(appointment.ends_at)}</p>
                  <p className="mt-1 truncate text-sm text-foreground">{appointment.client_name}</p>
                  <p className="mt-1 truncate text-xs text-muted">{appointment.vehicle} · {appointment.request_code}</p>
                </div>
              </div>
              <span className="mt-3 inline-flex rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-semibold text-success">{appointment.status === "confirmed" ? "Confirmada" : "Pendiente"}</span>
            </li>)}
          </ul> : <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/70 px-4 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted"><CalendarDays size={18} aria-hidden /></span>
            <p className="mt-3 text-sm font-medium text-navy">Sin citas para este día</p>
            <p className="mt-1 text-xs leading-5 text-muted">Selecciona otro día o cambia de mes para revisar la agenda.</p>
          </div>}
        </aside>
      </div>
    </section>
  );
}
