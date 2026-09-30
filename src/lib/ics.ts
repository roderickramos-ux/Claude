import type { RunSession } from "@/db/schema";
import { manilaDateTime } from "./dates";

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** RFC 5545 lines must be folded at 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsInput = {
  uidPrefix: string;
  title: string;
  description: string;
  url: string;
  sessions: RunSession[];
  venue?: string | null;
  organizerEmail?: string;
  now?: Date;
};

/** One VEVENT per training day, in UTC. */
export function buildIcs(input: IcsInput): string {
  const now = input.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Praxis Center for Advanced Management//Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  input.sessions.forEach((s, i) => {
    const location = s.mode === "online" ? `${s.location || "Online"} (link sent by email)` : [s.location, input.venue].filter(Boolean).join(" — ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${input.uidPrefix}-day${i + 1}@praxiscenter.ph`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(manilaDateTime(s.date, s.start))}`,
      `DTEND:${stamp(manilaDateTime(s.date, s.end))}`,
      `SUMMARY:${escape(`${input.title} — Day ${i + 1}`)}`,
      `DESCRIPTION:${escape(input.description)}`,
      `LOCATION:${escape(location)}`,
      `URL:${input.url}`,
      ...(input.organizerEmail ? [`ORGANIZER;CN=Praxis Center:mailto:${input.organizerEmail}`] : []),
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
