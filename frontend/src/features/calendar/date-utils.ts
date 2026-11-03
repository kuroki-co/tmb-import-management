export const CALENDAR_TIME_ZONE = "America/Lima";

export function limaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function dateKeyFromUtcDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addCalendarDays(dateKey: string, amount: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKeyFromUtcDate(date);
}

export function isWeekday(dateKey: string) {
  const weekday = dateKeyToUtcDate(dateKey).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function nextWeekday(dateKey: string) {
  let candidate = dateKey;
  while (!isWeekday(candidate)) candidate = addCalendarDays(candidate, 1);
  return candidate;
}

export function monthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function addCalendarMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthStartKey(month: string) {
  return `${month}-01`;
}

export function calendarMonthDays(month: string) {
  const first = dateKeyToUtcDate(monthStartKey(month));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const gridStart = addCalendarDays(monthStartKey(month), -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index));
}

export function formatDateKey(dateKey: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: CALENDAR_TIME_ZONE,
    ...options,
  }).format(dateKeyToUtcDate(dateKey));
}

export function dateKeyFromInstant(instant: string) {
  return limaDateKey(new Date(instant));
}

export function isSameMonth(dateKey: string, month: string) {
  return monthKey(dateKey) === month;
}
