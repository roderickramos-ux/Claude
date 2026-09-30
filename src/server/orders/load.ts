import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

/** Loads an order with everything needed to display it, email it or print it. */
export async function loadOrder(where: { id: string } | { orderNumber: string }) {
  const order = await db.query.orders.findFirst({
    where: "id" in where ? eq(schema.orders.id, where.id) : eq(schema.orders.orderNumber, where.orderNumber),
    with: {
      items: {
        orderBy: [asc(schema.orderItems.createdAt)],
        with: {
          run: { with: { course: true } },
          attendees: { orderBy: [asc(schema.attendees.createdAt)], with: { registration: true } },
        },
      },
      payments: { orderBy: [asc(schema.payments.createdAt)] },
      refunds: true,
      referral: true,
    },
  });
  return order ?? null;
}

export type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

export function orderSeatCount(order: Pick<LoadedOrder, "items">) {
  return order.items.reduce((s, i) => s + i.seats, 0);
}

export const ORDER_STATUS_LABEL: Record<LoadedOrder["status"], string> = {
  pending_payment: "Awaiting payment",
  awaiting_verification: "Payment under review",
  paid: "Paid — seats confirmed",
  cancelled: "Cancelled",
  expired: "Expired (unpaid)",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};
