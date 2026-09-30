import "server-only";
import { createHmac } from "node:crypto";
import { absoluteUrl } from "@/lib/utils";
import { safeEqualHex } from "../auth/crypto";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set");
    return "dev-only-insecure-secret-change-me";
  }
  return s;
}

/**
 * Guests view and pay their order through a secret link. The token is derived from the order ID
 * with HMAC, so it never needs to be stored and can be regenerated for reminder emails.
 */
export function orderAccessToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`order-access:${orderId}`).digest("hex").slice(0, 40);
}

export function verifyOrderAccessToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  return safeEqualHex(orderAccessToken(orderId), token);
}

export function orderUrl(order: { id: string; orderNumber: string }, suffix = ""): string {
  return absoluteUrl(`/orders/${order.orderNumber}${suffix}?t=${orderAccessToken(order.id)}`);
}
