"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { fromManilaDateTimeLocal } from "@/lib/dates";
import { pesosToCentavos } from "@/lib/money";
import { flushOutboxAfterResponse } from "../../notifications/flush";
import { enqueueEmail } from "../../notifications/outbox";
import {
  cancelOrder,
  extendPaymentDue,
  recordRefund,
  recordVerifiedPayment,
  rejectPayment,
  verifyPayment,
} from "../../orders/lifecycle";
import { guarded, optStr, str, type ActionState } from "./helpers";

const uuid = z.string().uuid();

function done(orderId: string, message: string): ActionState {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  flushOutboxAfterResponse();
  return { ok: true, message };
}

export async function verifyPaymentAction(_: ActionState, fd: FormData) {
  return guarded("staff", async (user) => {
    const paymentId = uuid.parse(fd.get("paymentId"));
    const orderId = uuid.parse(fd.get("orderId"));
    const res = await verifyPayment(paymentId, user.id);
    return done(orderId, res.status === "paid" ? "Payment verified. Seats confirmed and confirmation emails queued." : "Payment verified. A balance is still due.");
  });
}

export async function rejectPaymentAction(_: ActionState, fd: FormData) {
  return guarded("staff", async (user) => {
    const paymentId = uuid.parse(fd.get("paymentId"));
    const orderId = uuid.parse(fd.get("orderId"));
    const reason = z.string().trim().min(3, "Give a short reason for the buyer").max(500).parse(fd.get("reason"));
    await rejectPayment(paymentId, user.id, reason);
    return done(orderId, "Payment rejected. The buyer was notified.");
  });
}

export async function recordPaymentAction(_: ActionState, fd: FormData) {
  return guarded("staff", async (user) => {
    const orderId = uuid.parse(fd.get("orderId"));
    const amount = pesosToCentavos(str(fd, "amount"));
    if (amount <= 0) throw new Error("Enter the amount received");
    const res = await recordVerifiedPayment(orderId, user.id, {
      amountCentavos: amount,
      channelCode: optStr(fd, "channelCode") ?? undefined,
      referenceNumber: optStr(fd, "referenceNumber") ?? undefined,
      notes: optStr(fd, "notes") ?? undefined,
    });
    return done(orderId, res.status === "paid" ? "Payment recorded. Seats confirmed." : "Payment recorded. A balance is still due.");
  });
}

export async function cancelOrderAction(_: ActionState, fd: FormData) {
  return guarded("admin", async () => {
    const orderId = uuid.parse(fd.get("orderId"));
    const reason = z.string().trim().min(3, "Enter a reason").max(300).parse(fd.get("reason"));
    await cancelOrder(orderId, reason, fd.get("notify") === "on");
    return done(orderId, "Order cancelled and seats released.");
  });
}

export async function extendDueAction(_: ActionState, fd: FormData) {
  return guarded("staff", async () => {
    const orderId = uuid.parse(fd.get("orderId"));
    const until = fromManilaDateTimeLocal(str(fd, "until"));
    if (!until || until < new Date()) throw new Error("Choose a future date and time");
    await extendPaymentDue(orderId, until);
    return done(orderId, "Payment deadline extended.");
  });
}

export async function refundAction(_: ActionState, fd: FormData) {
  return guarded("admin", async (user) => {
    const orderId = uuid.parse(fd.get("orderId"));
    const amount = pesosToCentavos(str(fd, "amount"));
    if (amount <= 0) throw new Error("Enter the refund amount");
    await recordRefund(orderId, user.id, {
      amountCentavos: amount,
      reason: optStr(fd, "reason") ?? undefined,
      method: optStr(fd, "method") ?? undefined,
      reference: optStr(fd, "reference") ?? undefined,
      cancelSeats: fd.get("cancelSeats") === "on",
    });
    return done(orderId, "Refund recorded.");
  });
}

export async function saveOrderNotesAction(_: ActionState, fd: FormData) {
  return guarded("staff", async () => {
    const orderId = uuid.parse(fd.get("orderId"));
    await db
      .update(schema.orders)
      .set({ adminNotes: optStr(fd, "adminNotes"), receiptNumber: optStr(fd, "receiptNumber") })
      .where(eq(schema.orders.id, orderId));
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Saved." };
  });
}

export async function updateAttendeeAction(_: ActionState, fd: FormData) {
  return guarded("staff", async () => {
    const attendeeId = uuid.parse(fd.get("attendeeId"));
    const orderId = uuid.parse(fd.get("orderId"));
    const data = z
      .object({
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().toLowerCase().email(),
        mobile: z.string().trim().max(20).optional(),
        jobTitle: z.string().trim().max(120).optional(),
      })
      .parse({ fullName: fd.get("fullName"), email: fd.get("email"), mobile: optStr(fd, "mobile") ?? undefined, jobTitle: optStr(fd, "jobTitle") ?? undefined });
    await db.update(schema.attendees).set(data).where(eq(schema.attendees.id, attendeeId));
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Attendee updated." };
  });
}

export async function resendConfirmationAction(_: ActionState, fd: FormData) {
  return guarded("staff", async () => {
    const orderId = uuid.parse(fd.get("orderId"));
    const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
    if (!order) throw new Error("Order not found");
    const template = order.status === "paid" ? "payment_confirmed" : "order_received";
    await enqueueEmail(template, order.buyerEmail, { orderId }, { orderId });
    return done(orderId, `Re-sent "${template.replace("_", " ")}" email to ${order.buyerEmail}.`);
  });
}
