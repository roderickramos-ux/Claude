/**
 * Server-side pricing engine. Pure and deterministic: all inputs come from the database,
 * never from the client. See docs/pricing-rules.md for the stacking order.
 */
import type {
  OrderAdjustment,
  PriceBasis,
  PricedLine,
  PricingBreakdown,
  PricingReferralInput,
  PricingRunInput,
} from "./types";

/** Round to the nearest whole peso (100 centavos); prices are quoted in whole pesos. */
export function roundToPeso(centavos: number): number {
  return Math.round(centavos / 100) * 100;
}

function applyPercent(amount: number, percent: number): number {
  return amount * (1 - percent / 100);
}

export function isEarlyBird(run: Pick<PricingRunInput, "earlyBirdPercent" | "earlyBirdDeadline">, now: Date) {
  return (
    run.earlyBirdPercent > 0 && run.earlyBirdDeadline !== null && now.getTime() <= run.earlyBirdDeadline.getTime()
  );
}

export function isGroupRate(run: Pick<PricingRunInput, "groupDiscountPercent" | "groupMinSeats">, seats: number) {
  return run.groupDiscountPercent > 0 && run.groupMinSeats > 0 && seats >= run.groupMinSeats;
}

export function priceLine(run: PricingRunInput, now: Date): PricedLine {
  if (!Number.isInteger(run.seats) || run.seats < 1) throw new Error("seats must be a positive integer");
  const regular = run.regularPriceCentavos;
  const eb = isEarlyBird(run, now);
  const group = isGroupRate(run, run.seats);

  let unit = regular;
  let basis: PriceBasis = "regular";
  const notes: string[] = [];

  if (eb && group && run.stackDiscounts) {
    unit = applyPercent(applyPercent(regular, run.earlyBirdPercent), run.groupDiscountPercent);
    basis = "early_bird+group";
    notes.push(`Early-bird ${run.earlyBirdPercent}%`, `Group rate ${run.groupDiscountPercent}%`);
  } else if (eb || group) {
    // Not stacking: take whichever discount is larger. Ties go to early-bird.
    const ebPct = eb ? run.earlyBirdPercent : -1;
    const groupPct = group ? run.groupDiscountPercent : -1;
    if (ebPct >= groupPct) {
      unit = applyPercent(regular, run.earlyBirdPercent);
      basis = "early_bird";
      notes.push(`Early-bird ${run.earlyBirdPercent}%`);
    } else {
      unit = applyPercent(regular, run.groupDiscountPercent);
      basis = "group";
      notes.push(`Group rate ${run.groupDiscountPercent}% (${run.groupMinSeats}+ seats)`);
    }
  }

  const unitPrice = roundToPeso(unit);
  const lineTotal = unitPrice * run.seats;
  return {
    runId: run.runId,
    label: run.label,
    seats: run.seats,
    regularUnitCentavos: regular,
    unitPriceCentavos: unitPrice,
    priceBasis: basis,
    discountNotes: notes,
    discountCentavos: regular * run.seats - lineTotal,
    lineTotalCentavos: lineTotal,
  };
}

export type PriceOrderInput = {
  runs: PricingRunInput[];
  referral?: PricingReferralInput | null;
  now: Date;
  vatNote?: string | null;
};

export function priceOrder({ runs, referral, now, vatNote = null }: PriceOrderInput): PricingBreakdown {
  const lines = runs.map((r) => priceLine(r, now));
  const gross = lines.reduce((s, l) => s + l.regularUnitCentavos * l.seats, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCentavos, 0);

  const adjustments: OrderAdjustment[] = [];
  let total = subtotal;

  if (referral && referral.buyerDiscountPercent > 0 && total > 0) {
    const off = Math.min(total, roundToPeso((total * referral.buyerDiscountPercent) / 100));
    if (off > 0) {
      adjustments.push({
        type: "referral",
        label: `Referral code ${referral.code} (${referral.buyerDiscountPercent}%)`,
        amountCentavos: -off,
      });
      total -= off;
    }
  }

  return {
    lines,
    grossCentavos: gross,
    subtotalCentavos: subtotal,
    adjustments,
    discountCentavos: gross - total,
    totalCentavos: total,
    currency: "PHP",
    pricedAt: now.toISOString(),
    vatNote,
  };
}

/** Referral reward owed to the referrer once an order is paid. */
export function computeReferralReward(
  code: { rewardType: "percent" | "fixed_per_seat"; rewardValue: number },
  order: { totalCentavos: number; seats: number },
): number {
  if (code.rewardValue <= 0) return 0;
  if (code.rewardType === "percent") return roundToPeso((order.totalCentavos * code.rewardValue) / 100);
  return code.rewardValue * order.seats;
}
