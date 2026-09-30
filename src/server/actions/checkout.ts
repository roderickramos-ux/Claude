"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UtmData } from "@/db/schema";
import { checkoutSchema, fieldErrors } from "@/lib/validation/checkout";
import { getCurrentUser } from "../auth/session";
import { writeCart } from "../cart";
import { flushOutboxAfterResponse } from "../notifications/flush";
import { orderAccessToken } from "../orders/access";
import { CheckoutError, createOrder } from "../orders/create";
import { rateLimit } from "../ratelimit";
import { verifyTurnstile } from "../turnstile";

export type CheckoutState = { message?: string; errors?: Record<string, string> } | undefined;

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const rl = await rateLimit("checkout", 8, 600);
  if (!rl.ok) return { message: "Too many attempts. Please wait a few minutes and try again." };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { message: "Please complete the verification challenge." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { message: "Something went wrong. Please refresh and try again." };
  }
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };

  const store = await cookies();
  let utm: UtmData = {};
  try {
    utm = JSON.parse(store.get("praxis_utm")?.value ?? "{}");
  } catch {
    /* ignore malformed cookie */
  }

  let order;
  try {
    const user = await getCurrentUser();
    order = await createOrder(parsed.data, { utm, profileId: user?.id ?? null });
  } catch (e) {
    if (e instanceof CheckoutError) return { message: e.message, errors: e.fields };
    console.error("[checkout] failed", e);
    return { message: "We couldn't place your order. Please try again or contact us." };
  }

  await writeCart([]);
  store.delete("praxis_ref");
  flushOutboxAfterResponse();
  redirect(`/orders/${order.orderNumber}?t=${orderAccessToken(order.id)}&new=1`);
}
