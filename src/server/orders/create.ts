import "server-only";
import { and, count, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db/client";
import type { UtmData } from "@/db/schema";
import { addDays, manilaYmd } from "@/lib/dates";
import { priceOrder } from "@/lib/pricing/engine";
import type { PricingRunInput } from "@/lib/pricing/types";
import type { CheckoutData } from "@/lib/validation/checkout";
import { enqueueAdminEmail, enqueueEmail } from "../notifications/outbox";
import { SEAT_HOLDING_STATUSES } from "../queries/catalog";
import { getSettings } from "../settings";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function nextOrderNumber(tx: Tx, prefix: string, now: Date): Promise<string> {
  const year = manilaYmd(now).slice(0, 4);
  const [row] = await tx
    .insert(schema.counters)
    .values({ key: `order:${year}`, value: 1 })
    .onConflictDoUpdate({ target: schema.counters.key, set: { value: sql`${schema.counters.value} + 1` } })
    .returning({ value: schema.counters.value });
  return `${prefix}-${year}-${String(row.value).padStart(5, "0")}`;
}

export function runLabel(courseTitle: string, run: { code: string }) {
  return `${courseTitle} (${run.code})`;
}

/** Validates a referral code for a buyer. Returns null when no code was given. */
export async function resolveReferral(code: string | undefined, buyerEmail: string) {
  if (!code) return null;
  const ref = await db.query.referralCodes.findFirst({ where: eq(schema.referralCodes.code, code.toUpperCase()) });
  if (!ref || !ref.isActive) throw new CheckoutError("Referral code not recognized", { referralCode: "This referral code is not valid" });
  if (ref.referrerEmail && ref.referrerEmail.toLowerCase() === buyerEmail.toLowerCase()) {
    throw new CheckoutError("You cannot use your own referral code", { referralCode: "You cannot use your own referral code" });
  }
  if (ref.maxUses !== null) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.orders)
      .where(and(eq(schema.orders.referralCodeId, ref.id), notInArray(schema.orders.status, ["cancelled", "expired"])));
    if (n >= ref.maxUses) throw new CheckoutError("Referral code fully used", { referralCode: "This referral code has reached its limit" });
  }
  return ref;
}

export type CreateOrderContext = {
  now?: Date;
  utm?: UtmData;
  profileId?: string | null;
};

/**
 * Places an order atomically: locks the affected runs, re-checks availability, prices
 * server-side, and creates the order, attendees and seat-holding registrations.
 */
export async function createOrder(input: CheckoutData, ctx: CreateOrderContext = {}) {
  const now = ctx.now ?? new Date();
  const settings = await getSettings();

  let channel: typeof schema.paymentChannels.$inferSelect | undefined;
  if (input.paymentMethod === "channel") {
    channel = await db.query.paymentChannels.findFirst({
      where: and(eq(schema.paymentChannels.code, input.channelCode!), eq(schema.paymentChannels.isActive, true)),
    });
    if (!channel) throw new CheckoutError("Payment option unavailable", { channelCode: "Please choose another payment option" });
  }

  const referral = await resolveReferral(input.referralCode, input.buyer.email);
  const runIds = input.lines.map((l) => l.runId);

  const result = await db.transaction(async (tx) => {
    // Lock the runs so concurrent checkouts for the same batch are serialized.
    const runs = await tx
      .select({ run: schema.courseRuns, courseTitle: schema.courses.title, courseStatus: schema.courses.status })
      .from(schema.courseRuns)
      .innerJoin(schema.courses, eq(schema.courseRuns.courseId, schema.courses.id))
      .where(inArray(schema.courseRuns.id, runIds))
      .for("update", { of: schema.courseRuns });
    const byId = new Map(runs.map((r) => [r.run.id, r]));

    const taken = await tx
      .select({ runId: schema.registrations.runId, n: sql<number>`count(*)::int` })
      .from(schema.registrations)
      .where(and(inArray(schema.registrations.runId, runIds), inArray(schema.registrations.status, [...SEAT_HOLDING_STATUSES])))
      .groupBy(schema.registrations.runId);
    const takenBy = new Map(taken.map((t) => [t.runId, t.n]));

    const pricingRuns: PricingRunInput[] = [];
    for (const line of input.lines) {
      const r = byId.get(line.runId);
      if (!r || r.courseStatus !== "published") throw new CheckoutError("A program in your cart is no longer available.");
      const { run } = r;
      const label = runLabel(r.courseTitle, run);
      if (run.status !== "open" || run.startDate < manilaYmd(now) || (run.registrationDeadline && now > run.registrationDeadline)) {
        throw new CheckoutError(`Registration for ${label} is closed.`);
      }
      const left = run.capacity - (takenBy.get(run.id) ?? 0);
      if (line.attendees.length > left) {
        throw new CheckoutError(
          left <= 0
            ? `${label} is fully booked.`
            : `Only ${left} ${left === 1 ? "seat is" : "seats are"} left in ${label}. Please reduce the number of seats.`,
        );
      }
      pricingRuns.push({
        runId: run.id,
        label,
        seats: line.attendees.length,
        regularPriceCentavos: run.regularPriceCentavos,
        earlyBirdPercent: run.earlyBirdPercent,
        earlyBirdDeadline: run.earlyBirdDeadline,
        groupMinSeats: run.groupMinSeats,
        groupDiscountPercent: run.groupDiscountPercent,
        stackDiscounts: run.stackDiscounts,
      });
    }

    const pricing = priceOrder({
      runs: pricingRuns,
      now,
      referral: referral ? { code: referral.code, buyerDiscountPercent: referral.buyerDiscountPercent } : null,
      vatNote: settings.taxNote || null,
    });

    let organizationId: string | null = null;
    if (input.billing.company) {
      const [org] = await tx
        .insert(schema.organizations)
        .values({
          name: input.billing.company,
          address: input.billing.address,
          tin: input.billing.tin,
          billingContactName: input.billing.name ?? input.buyer.fullName,
          billingContactEmail: input.buyer.email,
          billingContactPhone: input.buyer.mobile,
        })
        .returning({ id: schema.organizations.id });
      organizationId = org.id;
    }

    const orderNumber = await nextOrderNumber(tx, settings.orderNumberPrefix, now);
    const [order] = await tx
      .insert(schema.orders)
      .values({
        orderNumber,
        status: "pending_payment",
        buyerName: input.buyer.fullName,
        buyerEmail: input.buyer.email,
        buyerMobile: input.buyer.mobile,
        profileId: ctx.profileId ?? null,
        organizationId,
        billing: {
          name: input.billing.name ?? input.buyer.fullName,
          company: input.billing.company,
          address: input.billing.address,
          tin: input.billing.tin,
        },
        paymentMethod: input.paymentMethod,
        paymentChannel: channel
          ? { code: channel.code, label: channel.label, kind: channel.kind, accountName: channel.accountName, accountNumber: channel.accountNumber }
          : null,
        subtotalCentavos: pricing.subtotalCentavos,
        discountCentavos: pricing.discountCentavos,
        totalCentavos: pricing.totalCentavos,
        pricing,
        referralCodeId: referral?.id ?? null,
        referralCode: referral?.code ?? null,
        utm: ctx.utm ?? {},
        privacyConsentAt: now,
        marketingOptIn: input.marketingOptIn,
        paymentDueAt: addDays(now, settings.paymentHoldDays),
      })
      .returning();

    for (const line of input.lines) {
      const priced = pricing.lines.find((l) => l.runId === line.runId)!;
      const [item] = await tx
        .insert(schema.orderItems)
        .values({
          orderId: order.id,
          runId: line.runId,
          label: priced.label,
          seats: priced.seats,
          regularUnitCentavos: priced.regularUnitCentavos,
          unitPriceCentavos: priced.unitPriceCentavos,
          priceBasis: priced.priceBasis,
          discountCentavos: priced.discountCentavos,
          lineTotalCentavos: priced.lineTotalCentavos,
        })
        .returning({ id: schema.orderItems.id });
      const attendeeRows = await tx
        .insert(schema.attendees)
        .values(line.attendees.map((a) => ({ ...a, orderId: order.id, orderItemId: item.id })))
        .returning({ id: schema.attendees.id });
      await tx.insert(schema.registrations).values(
        attendeeRows.map((a) => ({ runId: line.runId, attendeeId: a.id, orderId: order.id, status: "pending_payment" as const })),
      );
    }

    if (input.marketingOptIn) {
      await tx
        .insert(schema.subscribers)
        .values({
          email: input.buyer.email,
          fullName: input.buyer.fullName,
          source: "checkout",
          consentAt: now,
          unsubscribeToken: crypto.randomUUID(),
        })
        .onConflictDoNothing();
    }

    await enqueueEmail("order_received", order.buyerEmail, { orderId: order.id }, { orderId: order.id, dedupeKey: `order_received:${order.id}`, tx });
    await enqueueAdminEmail("admin_new_order", settings.adminNotificationEmails, { orderId: order.id }, {
      orderId: order.id,
      dedupeKey: `admin_new_order:${order.id}`,
      tx,
    });

    return order;
  });

  return result;
}
