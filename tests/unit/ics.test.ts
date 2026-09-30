import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/ics";

describe("buildIcs", () => {
  const ics = buildIcs({
    uidPrefix: "order-1-run-1",
    title: "Practical Project Management",
    description: "a, b; c",
    url: "https://praxiscenter.ph/courses/practical-project-management",
    venue: "Venue, BGC",
    sessions: [
      { date: "2026-11-14", start: "09:00", end: "17:00", mode: "in_person", location: "BGC" },
      { date: "2026-11-21", start: "09:00", end: "17:00", mode: "online", location: "Zoom" },
    ],
    now: new Date("2026-10-01T00:00:00Z"),
  });

  it("creates one event per session in UTC", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261114T010000Z");
    expect(ics).toContain("DTEND:20261114T090000Z");
  });
  it("escapes text and uses CRLF", () => {
    expect(ics).toContain("DESCRIPTION:a\\, b\\; c");
    expect(ics).toContain("\r\n");
  });
  it("folds long lines to 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
