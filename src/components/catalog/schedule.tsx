import { Laptop, MapPin } from "lucide-react";
import type { RunSession } from "@/db/schema";
import { formatDate, formatTime } from "@/lib/dates";

export function SessionList({ sessions }: { sessions: RunSession[] }) {
  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
      {sessions.map((s, i) => (
        <li key={s.date} className="flex items-start gap-4 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-heading text-lg text-primary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{formatDate(s.date)}</p>
            <p className="text-sm text-ink-muted">
              {formatTime(s.start)} – {formatTime(s.end)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-ink-muted">
            {s.mode === "online" ? <Laptop className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
            {s.location || (s.mode === "online" ? "Online" : "In person")}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** "Sat, 14 Nov – Sat, 5 Dec 2026 · 4 Saturdays" style summary. */
export function scheduleSummary(sessions: RunSession[], startDate: string, endDate: string) {
  if (sessions.length === 0) return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} – ${formatDate(endDate)}`;
  // Noon UTC falls on the same calendar date everywhere, so getUTCDay() is the date's weekday.
  const weekdays = new Set(sessions.map((s) => new Date(`${s.date}T12:00:00Z`).getUTCDay()));
  const allSat = weekdays.size === 1 && weekdays.has(6);
  const range = sessions.length === 1 ? formatDate(sessions[0].date) : `${formatDate(sessions[0].date)} – ${formatDate(sessions.at(-1)!.date)}`;
  return `${range} · ${sessions.length} ${allSat ? "Saturdays" : sessions.length === 1 ? "day" : "sessions"}`;
}

/** "BGC, Taguig + Zoom" from the session locations, falling back to the venue name. */
export function locationSummary(run: { sessions: RunSession[]; venueName: string | null; format: string }) {
  const locs = [...new Set(run.sessions.map((s) => s.location?.trim()).filter(Boolean))];
  if (locs.length > 0) return locs.join(" + ");
  if (run.format === "online") return "Live online";
  return run.venueName ?? "Metro Manila";
}
