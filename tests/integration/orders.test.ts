/**
 * Integration tests against a real Postgres (DATABASE_URL_TEST).
 * Covers: server-side pricing, capacity locking under concurrency, and the payment lifecycle.
 */
import "dotenv/config";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_URL = process.env.DATABASE_URL_TEST;
const d = TEST_URL ? describe : describe.skip;

type Mods = {
  db: typeof import("@/db/client");
  create: typeof import("@/server/orders/create");
  life: typeof import("@/server/orders/lifecycle");
};
let m: Mods;
let runId: string;

const buyer = { fullName: "Maria Santos", email: "maria@example.com", mobile: "09171234567" };
const attendee = (i: number) => ({ fullName: `Attendee ${i}`, email: `a${i}@example.com` });

function checkout(seats: number, extra: Record<string, unknown> = {}) {
  return {
    buyer,
    billing: {},
    lines: [{ runId, attendees: Array.from({ length: seats }, (_, i) => attendee(i)) }],
    paymentMethod: "channel" as const,
    channelCode: "gcash",
    agreeTerms: true as const,
    marketingOptIn: false,
    ...extra,
  };
}

d("orders (integration)", () => {
  beforeAll(async () => {
    const admin = postgres(TEST_URL!, { max: 1, onnotice: () => {} });
    await admin.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
    await admin.end();
    const { runMigrations } = await import("../../scripts/migrate");
    const { seed } = await import("../../scripts/seed");
    await runMigrations(TEST_URL!);
    await seed(TEST_URL!);

    process.env.DATABASE_URL = TEST_URL;
    m = {
      db: await import("@/db/client"),
      create: await import("@/server/orders/create"),
      life: await import("@/server/orders/lifecycle"),
    };
    const run = await m.db.db.query.courseRuns.findFirst();
    runId = run!.id;
    // Small capacity to exercise overbooking protection.
    const { eq } = await import("drizzle-orm");
    await m.db.db.update(m.db.schema.courseRuns).set({ capacity: 5 }).where(eq(m.db.schema.courseRuns.id, runId));
  }, 60_000);

  afterAll(async () => {
    await (globalThis as { pg?: { end: () => Promise<void> } }).pg?.end();
  });

  it("prices server-side with early-bird locked at order time", async () => {
    const { checkoutSchema } = await import("@/lib/validation/checkout");
    const order = await m.create.createOrder(checkoutSchema.parse(checkout(1)), {
      now: new Date("2026-10-15T10:00:00+08:00"),
    });
    expect(order.orderNumber).toMatch(/^PCAM-2026-\d{5}$/);
    expect(order.totalCentavos).toBe(15_300_00); // 18,000 − 15%
    expect(order.paymentDueAt.toISOString()).toBe(new Date("2026-10-20T10:00:00+08:00").toISOString());
  });

  it("never oversells seats under concurrent checkouts", async () => {
    const { checkoutSchema } = await import("@/lib/validation/checkout");
    const now = new Date("2026-11-02T10:00:00+08:00");
    // 4 seats left (1 taken above). Fire 4 concurrent 2-seat orders: only 2 may succeed.
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => m.create.createOrder(checkoutSchema.parse(checkout(2)), { now })),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(2);
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(failed[0].reason).toBeInstanceOf(m.create.CheckoutError);
    // Group rate (10% for 2+? no — min 3) does not apply to 2 seats: regular price.
    expect((ok[0] as PromiseFulfilledResult<{ totalCentavos: number }>).value.totalCentavos).toBe(36_000_00);
  });

  it("releases seats when unpaid orders expire", async () => {
    const { eq, and } = await import("drizzle-orm");
    const { db, schema } = m.db;
    const expired = await m.life.expireOverdueOrders(new Date("2026-12-31T00:00:00+08:00"));
    expect(expired).toBe(3);
    const active = await db
      .select()
      .from(schema.registrations)
      .where(and(eq(schema.registrations.runId, runId), eq(schema.registrations.status, "pending_payment")));
    expect(active).toHaveLength(0);
  });

  it("confirms seats when a submitted payment is verified and records referral rewards", async () => {
    const { eq } = await import("drizzle-orm");
    const { db, schema } = m.db;
    const { checkoutSchema } = await import("@/lib/validation/checkout");
    await db.insert(schema.referralCodes).values({ code: "ALUMNI-JUAN", referrerName: "Juan", rewardType: "fixed_per_seat", rewardValue: 500_00, buyerDiscountPercent: 5 });
    const admin = await db.insert(schema.profiles).values({ id: crypto.randomUUID(), email: "admin@example.com", role: "admin" }).returning();

    const order = await m.create.createOrder(checkoutSchema.parse(checkout(3, { referralCode: "alumni-juan" })), {
      now: new Date("2026-11-02T10:00:00+08:00"),
    });
    // 3 seats → group 10% → 16,200 × 3 = 48,600; referral 5% → 46,170
    expect(order.totalCentavos).toBe(46_170_00);

    await m.life.submitPaymentProof(order.id, {
      channelCode: "gcash",
      amountCentavos: order.totalCentavos,
      referenceNumber: "GC123456",
      proofPath: "proofs/test.png",
    });
    const payment = await db.query.payments.findFirst({ where: eq(schema.payments.orderId, order.id) });
    const res = await m.life.verifyPayment(payment!.id, admin[0].id);
    expect(res.status).toBe("paid");

    const regs = await db.select().from(schema.registrations).where(eq(schema.registrations.orderId, order.id));
    expect(regs.every((r) => r.status === "confirmed")).toBe(true);
    const reward = await db.query.referralRewards.findFirst({ where: eq(schema.referralRewards.orderId, order.id) });
    expect(reward?.amountCentavos).toBe(1_500_00);

    const emails = await db.select().from(schema.notifications).where(eq(schema.notifications.orderId, order.id));
    const templates = emails.map((e) => e.template).sort();
    expect(templates).toContain("payment_confirmed");
    expect(templates.filter((t) => t === "attendee_confirmed")).toHaveLength(3);
  });

  it("rejects self-referral and unknown codes", async () => {
    const { checkoutSchema } = await import("@/lib/validation/checkout");
    const { db, schema } = m.db;
    await db.insert(schema.referralCodes).values({ code: "MARIA", referrerName: "Maria", referrerEmail: "maria@example.com" });
    await expect(m.create.createOrder(checkoutSchema.parse(checkout(1, { referralCode: "MARIA" })))).rejects.toThrow(/own referral/);
    await expect(m.create.createOrder(checkoutSchema.parse(checkout(1, { referralCode: "NOPE" })))).rejects.toThrow(/not recognized/);
  });
});
