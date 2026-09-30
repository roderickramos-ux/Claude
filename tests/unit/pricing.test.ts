import { describe, expect, it } from "vitest";
import { computeReferralReward, priceLine, priceOrder, roundToPeso } from "@/lib/pricing/engine";
import type { PricingRunInput } from "@/lib/pricing/types";

const deadline = new Date("2026-10-31T23:59:59+08:00");
const base: PricingRunInput = {
  runId: "run-1",
  label: "Practical Project Management — Nov 2026",
  seats: 1,
  regularPriceCentavos: 18_000_00,
  earlyBirdPercent: 15,
  earlyBirdDeadline: deadline,
  groupMinSeats: 3,
  groupDiscountPercent: 10,
  stackDiscounts: false,
};
const before = new Date("2026-10-15T10:00:00+08:00");
const after = new Date("2026-11-02T10:00:00+08:00");

describe("roundToPeso", () => {
  it("rounds to whole pesos", () => {
    expect(roundToPeso(1234549)).toBe(1234500);
    expect(roundToPeso(1234550)).toBe(1234600);
  });
});

describe("priceLine", () => {
  it("charges regular price after the early-bird deadline", () => {
    const l = priceLine(base, after);
    expect(l.priceBasis).toBe("regular");
    expect(l.lineTotalCentavos).toBe(18_000_00);
    expect(l.discountCentavos).toBe(0);
  });

  it("applies 15% early-bird up to and including the deadline instant", () => {
    expect(priceLine(base, before).unitPriceCentavos).toBe(15_300_00);
    expect(priceLine(base, deadline).priceBasis).toBe("early_bird");
    expect(priceLine(base, new Date(deadline.getTime() + 1000)).priceBasis).toBe("regular");
  });

  it("applies group rate at the minimum seat count only", () => {
    expect(priceLine({ ...base, seats: 2 }, after).priceBasis).toBe("regular");
    const l = priceLine({ ...base, seats: 3 }, after);
    expect(l.priceBasis).toBe("group");
    expect(l.unitPriceCentavos).toBe(16_200_00);
    expect(l.lineTotalCentavos).toBe(48_600_00);
    expect(l.discountCentavos).toBe(5_400_00);
  });

  it("does not stack by default: picks the larger discount", () => {
    const l = priceLine({ ...base, seats: 4 }, before);
    expect(l.priceBasis).toBe("early_bird");
    expect(l.unitPriceCentavos).toBe(15_300_00);

    const bigGroup = priceLine({ ...base, seats: 4, groupDiscountPercent: 20 }, before);
    expect(bigGroup.priceBasis).toBe("group");
    expect(bigGroup.unitPriceCentavos).toBe(14_400_00);
  });

  it("stacks multiplicatively when enabled", () => {
    const l = priceLine({ ...base, seats: 3, stackDiscounts: true }, before);
    expect(l.priceBasis).toBe("early_bird+group");
    // 18,000 × 0.85 × 0.90 = 13,770
    expect(l.unitPriceCentavos).toBe(13_770_00);
  });

  it("ignores early-bird without a deadline and group rate at 0%", () => {
    const l = priceLine({ ...base, seats: 5, earlyBirdDeadline: null, groupDiscountPercent: 0 }, before);
    expect(l.priceBasis).toBe("regular");
  });

  it("rejects invalid seat counts", () => {
    expect(() => priceLine({ ...base, seats: 0 }, before)).toThrow();
    expect(() => priceLine({ ...base, seats: 1.5 }, before)).toThrow();
  });
});

describe("priceOrder", () => {
  it("sums lines across runs", () => {
    const b = priceOrder({
      runs: [base, { ...base, runId: "run-2", seats: 3 }],
      now: after,
    });
    expect(b.grossCentavos).toBe(72_000_00);
    expect(b.subtotalCentavos).toBe(18_000_00 + 48_600_00);
    expect(b.totalCentavos).toBe(b.subtotalCentavos);
    expect(b.discountCentavos).toBe(5_400_00);
  });

  it("applies a referral buyer discount after line discounts", () => {
    const b = priceOrder({
      runs: [base],
      now: before,
      referral: { code: "ALUMNI1", buyerDiscountPercent: 5 },
    });
    // 15,300 − 5% (765) = 14,535
    expect(b.adjustments).toHaveLength(1);
    expect(b.adjustments[0].amountCentavos).toBe(-765_00);
    expect(b.totalCentavos).toBe(14_535_00);
    expect(b.discountCentavos).toBe(18_000_00 - 14_535_00);
  });

  it("adds no adjustment for a referral code without buyer discount", () => {
    const b = priceOrder({ runs: [base], now: after, referral: { code: "X", buyerDiscountPercent: 0 } });
    expect(b.adjustments).toHaveLength(0);
    expect(b.totalCentavos).toBe(18_000_00);
  });
});

describe("computeReferralReward", () => {
  it("computes fixed-per-seat rewards", () => {
    expect(computeReferralReward({ rewardType: "fixed_per_seat", rewardValue: 500_00 }, { totalCentavos: 1, seats: 3 })).toBe(1_500_00);
  });
  it("computes percent rewards rounded to the peso", () => {
    expect(computeReferralReward({ rewardType: "percent", rewardValue: 5 }, { totalCentavos: 15_300_00, seats: 1 })).toBe(765_00);
  });
  it("returns 0 when disabled", () => {
    expect(computeReferralReward({ rewardType: "percent", rewardValue: 0 }, { totalCentavos: 100, seats: 1 })).toBe(0);
  });
});
