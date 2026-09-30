import { describe, expect, it } from "vitest";
import { formatPHP, pesosToCentavos } from "@/lib/money";
import { formatTime, fromManilaDateTimeLocal, manilaDateTime, manilaYmd, toManilaDateTimeLocal } from "@/lib/dates";

describe("money", () => {
  it("formats pesos", () => {
    expect(formatPHP(18_000_00)).toBe("₱18,000");
    expect(formatPHP(12_345_50)).toBe("₱12,345.50");
  });
  it("parses admin input", () => {
    expect(pesosToCentavos("18,000")).toBe(18_000_00);
    expect(pesosToCentavos("₱ 99.99")).toBe(9_999);
    expect(() => pesosToCentavos("abc")).toThrow();
  });
});

describe("dates (Asia/Manila)", () => {
  it("converts Manila wall time to UTC", () => {
    expect(manilaDateTime("2026-11-14", "09:00").toISOString()).toBe("2026-11-14T01:00:00.000Z");
  });
  it("reports the Manila calendar date", () => {
    expect(manilaYmd(new Date("2026-11-13T16:30:00Z"))).toBe("2026-11-14");
  });
  it("round-trips datetime-local values", () => {
    const d = fromManilaDateTimeLocal("2026-10-31T23:59")!;
    expect(d.toISOString()).toBe("2026-10-31T15:59:00.000Z");
    expect(toManilaDateTimeLocal(d)).toBe("2026-10-31T23:59");
  });
  it("formats times", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(formatTime("00:05")).toBe("12:05 AM");
  });
});
