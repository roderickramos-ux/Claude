export type PriceBasis = "regular" | "early_bird" | "group" | "early_bird+group";

export type PricingRunInput = {
  runId: string;
  label: string;
  seats: number;
  regularPriceCentavos: number;
  earlyBirdPercent: number;
  earlyBirdDeadline: Date | null;
  groupMinSeats: number;
  groupDiscountPercent: number;
  stackDiscounts: boolean;
};

export type PricingReferralInput = {
  code: string;
  buyerDiscountPercent: number;
};

export type PricedLine = {
  runId: string;
  label: string;
  seats: number;
  regularUnitCentavos: number;
  unitPriceCentavos: number;
  priceBasis: PriceBasis;
  /** Human-readable discount notes, e.g. "Early-bird 15%". */
  discountNotes: string[];
  discountCentavos: number;
  lineTotalCentavos: number;
};

export type OrderAdjustment = {
  type: "referral";
  label: string;
  /** Negative for discounts. */
  amountCentavos: number;
};

export type PricingBreakdown = {
  lines: PricedLine[];
  /** Sum of seats × regular unit price. */
  grossCentavos: number;
  /** Sum of line totals (after early-bird / group). */
  subtotalCentavos: number;
  adjustments: OrderAdjustment[];
  /** Total discount versus gross. */
  discountCentavos: number;
  totalCentavos: number;
  currency: "PHP";
  pricedAt: string;
  vatNote: string | null;
};
