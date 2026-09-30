import { safeEqualHex } from "@/server/auth/crypto";
import { processOutbox, recoverStuckNotifications } from "@/server/notifications/outbox";
import { expireOverdueOrders, sendPaymentReminders } from "@/server/orders/lifecycle";

export const maxDuration = 60;

/**
 * Scheduled jobs (see vercel.json). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 *   /api/cron/maintenance — reminders, expiries, and outbox delivery/retries
 *   /api/cron/outbox      — outbox only
 */
export async function GET(request: Request, ctx: RouteContext<"/api/cron/[job]">) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqualHex(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  const { job } = await ctx.params;
  const result: Record<string, unknown> = {};
  if (job === "maintenance") {
    await recoverStuckNotifications();
    result.reminders = await sendPaymentReminders();
    result.expired = await expireOverdueOrders();
  } else if (job !== "outbox") {
    return new Response("Unknown job", { status: 404 });
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < 5; i++) {
    const r = await processOutbox(25);
    sent += r.sent;
    failed += r.failed;
    if (r.sent + r.failed < 25) break;
  }
  result.emails = { sent, failed };
  return Response.json({ ok: true, job, ...result });
}
