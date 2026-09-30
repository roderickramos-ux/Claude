/** All display and scheduling logic uses Asia/Manila (UTC+8, no DST). */
export const TIMEZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

type DateInput = Date | string;

function toDate(d: DateInput): Date {
  if (d instanceof Date) return d;
  // Plain dates ("2026-11-14") are Manila calendar dates, not UTC midnight.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00${MANILA_OFFSET}`) : new Date(d);
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: TIMEZONE, ...opts });

/** "Sat, 14 Nov 2026" */
export const formatDate = (d: DateInput) =>
  fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(toDate(d));

/** "14 November 2026" */
export const formatDateLong = (d: DateInput) =>
  fmt({ day: "numeric", month: "long", year: "numeric" }).format(toDate(d));

/** "14 Nov" */
export const formatDayMonth = (d: DateInput) => fmt({ day: "numeric", month: "short" }).format(toDate(d));

/** "14 Nov 2026, 5:30 PM" */
export const formatDateTime = (d: DateInput) =>
  fmt({ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    toDate(d),
  );

/** "November 2026" */
export const formatMonthYear = (d: DateInput) => fmt({ month: "long", year: "numeric" }).format(toDate(d));

/** "9:00 AM" from "09:00" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Converts a Manila wall-clock date + time to a UTC Date. */
export function manilaDateTime(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00${MANILA_OFFSET}`);
}

/** YYYY-MM-DD of the given instant in Manila. */
export function manilaYmd(d: Date = new Date()): string {
  const parts = Object.fromEntries(
    fmt({ year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Value for <input type="datetime-local"> in Manila time. */
export function toManilaDateTimeLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const parts = Object.fromEntries(
    fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Parses <input type="datetime-local"> (Manila) to a Date, or null when empty. */
export function fromManilaDateTimeLocal(v: string | null | undefined): Date | null {
  if (!v) return null;
  return new Date(`${v.length === 16 ? `${v}:00` : v}${MANILA_OFFSET}`);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
