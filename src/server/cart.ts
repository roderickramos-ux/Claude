import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * The cart lives in a cookie: just run IDs and seat counts. Prices and availability are
 * always recomputed server-side from the database.
 */
export const CART_COOKIE = "praxis_cart";
export const MAX_SEATS_PER_LINE = 50;

const cartSchema = z
  .array(z.object({ runId: z.string().uuid(), seats: z.number().int().min(1).max(MAX_SEATS_PER_LINE) }))
  .max(10);

export type CartLine = z.infer<typeof cartSchema>[number];

export async function readCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.runId, Math.min(MAX_SEATS_PER_LINE, (merged.get(l.runId) ?? 0) + l.seats));
  const value = [...merged].map(([runId, seats]) => ({ runId, seats })).filter((l) => l.seats > 0);
  if (value.length === 0) store.delete(CART_COOKIE);
  else
    store.set(CART_COOKIE, JSON.stringify(value), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
}

export async function cartSeatCount(): Promise<number> {
  return (await readCart()).reduce((s, l) => s + l.seats, 0);
}
