import "server-only";
import { eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db/client";
import { priceOrder } from "@/lib/pricing/engine";
import type { PricingBreakdown } from "@/lib/pricing/types";
import { readCart } from "./cart";
import { runLabel } from "./orders/create";
import { withAvailability, type RunWithAvailability } from "./queries/catalog";
import { getSettings } from "./settings";

export type CartViewLine = {
  run: RunWithAvailability;
  course: typeof schema.courses.$inferSelect;
  seats: number;
  label: string;
  problem: string | null;
};

export type CartView = {
  lines: CartViewLine[];
  pricing: PricingBreakdown | null;
  referral: { code: string; buyerDiscountPercent: number; referrerName: string } | null;
  hasProblems: boolean;
};

/** Current cart with live availability and a server-side price preview. */
export async function getCartView(referralOverride?: string | null): Promise<CartView> {
  const cart = await readCart();
  if (cart.length === 0) return { lines: [], pricing: null, referral: null, hasProblems: false };

  const rows = await db
    .select({ run: schema.courseRuns, course: schema.courses })
    .from(schema.courseRuns)
    .innerJoin(schema.courses, eq(schema.courseRuns.courseId, schema.courses.id))
    .where(inArray(schema.courseRuns.id, cart.map((c) => c.runId)));
  const runs = await withAvailability(rows.map((r) => r.run));

  const lines: CartViewLine[] = [];
  for (const c of cart) {
    const i = rows.findIndex((r) => r.run.id === c.runId);
    if (i < 0) continue;
    const run = runs[i];
    const course = rows[i].course;
    let problem: string | null = null;
    if (!run.isBookable || course.status !== "published") problem = "Registration for this batch is closed.";
    else if (c.seats > run.seatsLeft) problem = `Only ${run.seatsLeft} ${run.seatsLeft === 1 ? "seat" : "seats"} left.`;
    lines.push({ run, course, seats: c.seats, label: runLabel(course.title, run), problem });
  }

  const code = (referralOverride ?? (await cookies()).get("praxis_ref")?.value ?? "").toUpperCase();
  let referral: CartView["referral"] = null;
  if (code) {
    const r = await db.query.referralCodes.findFirst({ where: eq(schema.referralCodes.code, code) });
    if (r?.isActive) referral = { code: r.code, buyerDiscountPercent: r.buyerDiscountPercent, referrerName: r.referrerName };
  }

  const settings = await getSettings();
  const priceable = lines.filter((l) => !l.problem);
  const pricing =
    priceable.length > 0
      ? priceOrder({
          runs: priceable.map((l) => ({
            runId: l.run.id,
            label: l.label,
            seats: l.seats,
            regularPriceCentavos: l.run.regularPriceCentavos,
            earlyBirdPercent: l.run.earlyBirdPercent,
            earlyBirdDeadline: l.run.earlyBirdDeadline,
            groupMinSeats: l.run.groupMinSeats,
            groupDiscountPercent: l.run.groupDiscountPercent,
            stackDiscounts: l.run.stackDiscounts,
          })),
          now: new Date(),
          referral,
          vatNote: settings.taxNote || null,
        })
      : null;

  return { lines, pricing, referral, hasProblems: lines.some((l) => l.problem) };
}
