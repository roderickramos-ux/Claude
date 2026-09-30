import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/settings-schema";
import { priceOrder } from "@/lib/pricing/engine";
import { renderOrderDocument } from "@/server/pdf/order-document";
import type { LoadedOrder } from "@/server/orders/load";

describe("order PDF", () => {
  it("renders acknowledgment and proforma documents", async () => {
    const pricing = priceOrder({
      runs: [{ runId: "r1", label: "Practical Project Management (PPM-2026-11)", seats: 2, regularPriceCentavos: 18_000_00, earlyBirdPercent: 15, earlyBirdDeadline: new Date("2030-01-01"), groupMinSeats: 3, groupDiscountPercent: 10, stackDiscounts: false }],
      now: new Date("2026-10-01"),
      vatNote: "Non-VAT registered",
    });
    const order = {
      id: "o1",
      orderNumber: "PCAM-2026-00001",
      status: "pending_payment",
      createdAt: new Date("2026-10-01"),
      paymentDueAt: new Date("2026-10-06"),
      paidAt: null,
      receiptNumber: null,
      buyerEmail: "maria@example.com",
      buyerMobile: "09171234567",
      billing: { name: "Maria Santos", company: "Acme PH", address: "BGC, Taguig", tin: "123-456-789-000" },
      paymentMethod: "bill_company",
      paymentChannel: null,
      totalCentavos: pricing.totalCentavos,
      pricing,
      payments: [],
      items: [
        {
          id: "i1",
          label: pricing.lines[0].label,
          seats: 2,
          priceBasis: "early_bird",
          regularUnitCentavos: 18_000_00,
          unitPriceCentavos: pricing.lines[0].unitPriceCentavos,
          lineTotalCentavos: pricing.lines[0].lineTotalCentavos,
          run: { sessions: [{ date: "2026-11-14", start: "09:00", end: "17:00", mode: "in_person" }] },
          attendees: [{ fullName: "Maria Santos" }, { fullName: "Jose Rizal" }],
        },
      ],
    } as unknown as LoadedOrder;
    for (const kind of ["proforma", "acknowledgment"] as const) {
      const pdf = await renderOrderDocument(order, defaultSettings, kind);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect(pdf.length).toBeGreaterThan(1500);
    }
  }, 30_000);
});
