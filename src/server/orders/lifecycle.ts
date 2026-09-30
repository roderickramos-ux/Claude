import "server-only";
import { and, eq, inArray, isNull, lte, gt, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db/client";
import { computeReferralReward } from "@/lib/pricing/engine";
import { enqueueAdminEmail, enqueueEmail } from "../notifications/outbox";
import { getSettings } from "../settings";

export class OrderActionError extends Error {}

type OrderRow = typeof schema.orders.$inferSelect;

async function lockOrder(tx: Tx, orderId: string): Promise<OrderRow> {
  const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
  if (!order) throw new OrderActionError("Order not found");
  return order;
}

async function verifiedTotal(tx: Tx, orderId: string) {
  const [{ total }] = await tx
    .select({ total: sql<number>`coalesce(sum(${schema.payments.amountCentavos}), 0)::bigint` })
    .from(schema.payments)
    .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "verified")));
  return Number(total);
}

/** Buyer submits proof of an offline payment. */
export async function submitPaymentProof(
  orderId: string,
  data: { channelCode: string; amountCentavos: number; referenceNumber: string; payerName?: string; proofPath: string },
) {
  const settings = await getSettings();
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!["pending_payment", "awaiting_verification"].includes(order.status)) {
      throw new OrderActionError("This order is no longer awaiting payment.");
    }
    const [payment] = await tx
      .insert(schema.payments)
      .values({
        orderId,
        channelCode: data.channelCode,
        amountCentavos: data.amountCentavos,
        referenceNumber: data.referenceNumber,
        payerName: data.payerName,
        proofPath: data.proofPath,
        status: "submitted",
      })
      .returning({ id: schema.payments.id });
    await tx.update(schema.orders).set({ status: "awaiting_verification" }).where(eq(schema.orders.id, orderId));
    await enqueueEmail("payment_submitted", order.buyerEmail, { orderId }, { orderId, dedupeKey: `payment_submitted:${payment.id}`, tx });
    await enqueueAdminEmail("admin_payment_submitted", settings.adminNotificationEmails, { orderId }, {
      orderId,
      dedupeKey: `admin_payment_submitted:${payment.id}`,
      tx,
    });
  });
}

/** Marks the order paid, confirms seats, records referral rewards and queues confirmations. */
async function confirmOrder(tx: Tx, order: OrderRow) {
  const now = new Date();
  await tx.update(schema.orders).set({ status: "paid", paidAt: now }).where(eq(schema.orders.id, order.id));
  await tx
    .update(schema.registrations)
    .set({ status: "confirmed", confirmedAt: now })
    .where(and(eq(schema.registrations.orderId, order.id), eq(schema.registrations.status, "pending_payment")));

  if (order.referralCodeId) {
    const code = await tx.query.referralCodes.findFirst({ where: eq(schema.referralCodes.id, order.referralCodeId) });
    if (code) {
      const seats = order.pricing.lines.reduce((s, l) => s + l.seats, 0);
      const amount = computeReferralReward(code, { totalCentavos: order.totalCentavos, seats });
      if (amount > 0) {
        await tx
          .insert(schema.referralRewards)
          .values({ referralCodeId: code.id, orderId: order.id, amountCentavos: amount })
          .onConflictDoNothing();
      }
    }
  }

  await enqueueEmail("payment_confirmed", order.buyerEmail, { orderId: order.id }, {
    orderId: order.id,
    dedupeKey: `payment_confirmed:${order.id}`,
    tx,
  });
  const attendees = await tx.select().from(schema.attendees).where(eq(schema.attendees.orderId, order.id));
  const buyer = order.buyerEmail.toLowerCase();
  for (const a of attendees) {
    if (a.email.toLowerCase() === buyer) continue;
    await enqueueEmail("attendee_confirmed", a.email, { orderId: order.id, attendeeId: a.id }, {
      orderId: order.id,
      dedupeKey: `attendee_confirmed:${a.id}`,
      tx,
    });
  }
}

/** Admin verifies a submitted payment. Confirms the order once verified payments cover the total. */
export async function verifyPayment(paymentId: string, adminId: string) {
  return db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
    if (!payment) throw new OrderActionError("Payment not found");
    const order = await lockOrder(tx, payment.orderId);
    if (payment.status !== "submitted") throw new OrderActionError("Payment was already reviewed");
    if (!["pending_payment", "awaiting_verification", "expired"].includes(order.status)) {
      throw new OrderActionError(`Cannot verify a payment on a ${order.status} order`);
    }
    await tx
      .update(schema.payments)
      .set({ status: "verified", verifiedBy: adminId, verifiedAt: new Date() })
      .where(eq(schema.payments.id, paymentId));
    return settleIfCovered(tx, order);
  });
}

async function settleIfCovered(tx: Tx, order: OrderRow) {
  const paid = await verifiedTotal(tx, order.id);
  if (paid >= order.totalCentavos) {
    if (order.status === "expired") {
      // Late payment on an expired order: re-activate seats only if capacity allows.
      await reactivateExpired(tx, order);
    }
    await confirmOrder(tx, order);
    return { status: "paid" as const, paid };
  }
  const pendingProofs = await tx
    .select({ id: schema.payments.id })
    .from(schema.payments)
    .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "submitted")));
  await tx
    .update(schema.orders)
    .set({ status: pendingProofs.length > 0 ? "awaiting_verification" : "pending_payment" })
    .where(eq(schema.orders.id, order.id));
  return { status: "partial" as const, paid };
}

async function reactivateExpired(tx: Tx, order: OrderRow) {
  const regs = await tx.select().from(schema.registrations).where(eq(schema.registrations.orderId, order.id));
  const runIds = [...new Set(regs.map((r) => r.runId))];
  const runs = await tx.select().from(schema.courseRuns).where(inArray(schema.courseRuns.id, runIds)).for("update");
  for (const run of runs) {
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.runId, run.id), inArray(schema.registrations.status, ["pending_payment", "confirmed", "attended", "completed"])));
    const needed = regs.filter((r) => r.runId === run.id).length;
    if (run.capacity - n < needed) {
      throw new OrderActionError(`Not enough seats left in ${run.code} to reinstate this expired order. Adjust capacity first.`);
    }
  }
  await tx
    .update(schema.registrations)
    .set({ status: "pending_payment", cancelledAt: null })
    .where(eq(schema.registrations.orderId, order.id));
}

/** Admin records a payment received directly (e.g. company check) and verifies it in one step. */
export async function recordVerifiedPayment(
  orderId: string,
  adminId: string,
  data: { amountCentavos: number; channelCode?: string; referenceNumber?: string; notes?: string },
) {
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!["pending_payment", "awaiting_verification", "expired"].includes(order.status)) {
      throw new OrderActionError(`Cannot record a payment on a ${order.status} order`);
    }
    await tx.insert(schema.payments).values({
      orderId,
      amountCentavos: data.amountCentavos,
      channelCode: data.channelCode ?? "manual",
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      status: "verified",
      verifiedBy: adminId,
      verifiedAt: new Date(),
    });
    return settleIfCovered(tx, order);
  });
}

export async function rejectPayment(paymentId: string, adminId: string, reason: string) {
  await db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
    if (!payment) throw new OrderActionError("Payment not found");
    const order = await lockOrder(tx, payment.orderId);
    if (payment.status !== "submitted") throw new OrderActionError("Payment was already reviewed");
    await tx
      .update(schema.payments)
      .set({ status: "rejected", rejectionReason: reason, verifiedBy: adminId, verifiedAt: new Date() })
      .where(eq(schema.payments.id, paymentId));
    const others = await tx
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "submitted")));
    if (others.length === 0 && order.status === "awaiting_verification") {
      await tx.update(schema.orders).set({ status: "pending_payment" }).where(eq(schema.orders.id, order.id));
    }
    await enqueueEmail("payment_rejected", order.buyerEmail, { orderId: order.id, reason }, {
      orderId: order.id,
      dedupeKey: `payment_rejected:${paymentId}`,
      tx,
    });
  });
}

export async function cancelOrder(orderId: string, reason: string, notify = true) {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (["cancelled", "refunded"].includes(order.status)) throw new OrderActionError("Order is already cancelled");
    const now = new Date();
    await tx.update(schema.orders).set({ status: "cancelled", cancelledAt: now, cancelReason: reason }).where(eq(schema.orders.id, orderId));
    await tx
      .update(schema.registrations)
      .set({ status: "cancelled", cancelledAt: now })
      .where(eq(schema.registrations.orderId, orderId));
    await tx
      .update(schema.referralRewards)
      .set({ status: "void" })
      .where(and(eq(schema.referralRewards.orderId, orderId), eq(schema.referralRewards.status, "pending")));
    if (notify) {
      await enqueueEmail("order_cancelled", order.buyerEmail, { orderId, reason }, { orderId, dedupeKey: `order_cancelled:${orderId}`, tx });
    }
  });
}

export async function extendPaymentDue(orderId: string, until: Date) {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!["pending_payment", "awaiting_verification"].includes(order.status)) {
      throw new OrderActionError("Only unpaid orders can be extended");
    }
    await tx.update(schema.orders).set({ paymentDueAt: until }).where(eq(schema.orders.id, orderId));
  });
}

export async function recordRefund(
  orderId: string,
  adminId: string,
  data: { amountCentavos: number; reason?: string; method?: string; reference?: string; cancelSeats: boolean },
) {
  await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!["paid", "partially_refunded"].includes(order.status)) throw new OrderActionError("Only paid orders can be refunded");
    await tx.insert(schema.refunds).values({ orderId, ...data, processedBy: adminId });
    const paid = await verifiedTotal(tx, orderId);
    const [{ refunded }] = await tx
      .select({ refunded: sql<number>`coalesce(sum(${schema.refunds.amountCentavos}), 0)::bigint` })
      .from(schema.refunds)
      .where(eq(schema.refunds.orderId, orderId));
    if (Number(refunded) > paid) throw new OrderActionError("Refunds cannot exceed the amount paid");
    const full = Number(refunded) >= paid;
    await tx
      .update(schema.orders)
      .set({ status: full ? "refunded" : "partially_refunded" })
      .where(eq(schema.orders.id, orderId));
    if (data.cancelSeats || full) {
      await tx
        .update(schema.registrations)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(schema.registrations.orderId, orderId));
    }
    if (full) {
      await tx.update(schema.referralRewards).set({ status: "void" }).where(eq(schema.referralRewards.orderId, orderId));
    }
  });
}

/** Cron: release seats of unpaid orders past their hold (orders with proof under review are kept). */
export async function expireOverdueOrders(now = new Date()) {
  const overdue = await db
    .select({ id: schema.orders.id, email: schema.orders.buyerEmail })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "pending_payment"), lte(schema.orders.paymentDueAt, now)));
  for (const o of overdue) {
    await db.transaction(async (tx) => {
      const order = await lockOrder(tx, o.id);
      if (order.status !== "pending_payment") return;
      await tx.update(schema.orders).set({ status: "expired" }).where(eq(schema.orders.id, o.id));
      await tx
        .update(schema.registrations)
        .set({ status: "cancelled", cancelledAt: now })
        .where(and(eq(schema.registrations.orderId, o.id), eq(schema.registrations.status, "pending_payment")));
      await enqueueEmail("order_expired", order.buyerEmail, { orderId: o.id }, { orderId: o.id, dedupeKey: `order_expired:${o.id}`, tx });
    });
  }
  return overdue.length;
}

/** Cron: one reminder for orders unpaid 24h after placing, while the hold is still active. */
export async function sendPaymentReminders(now = new Date()) {
  const due = await db
    .select({ id: schema.orders.id, email: schema.orders.buyerEmail })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "pending_payment"),
        isNull(schema.orders.reminderSentAt),
        lte(schema.orders.createdAt, new Date(now.getTime() - 24 * 3600_000)),
        gt(schema.orders.paymentDueAt, now),
      ),
    );
  for (const o of due) {
    await db.transaction(async (tx) => {
      await tx.update(schema.orders).set({ reminderSentAt: now }).where(eq(schema.orders.id, o.id));
      await enqueueEmail("payment_reminder", o.email, { orderId: o.id }, { orderId: o.id, dedupeKey: `payment_reminder:${o.id}`, tx });
    });
  }
  return due.length;
}
