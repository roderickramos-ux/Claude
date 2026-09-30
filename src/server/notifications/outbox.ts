import "server-only";
import { render } from "@react-email/components";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db/client";
import { getEmailProvider } from "./providers";
import { renderTemplate, type TemplateKey, type TemplatePayloads } from "./templates";

const MAX_ATTEMPTS = 5;

type EnqueueOptions = {
  orderId?: string | null;
  /** Skip if a notification with this key already exists (idempotent sends). */
  dedupeKey?: string;
  scheduledFor?: Date;
  tx?: Tx;
};

/** Adds an email to the outbox. Delivery happens in processOutbox (inline after requests, and by cron). */
export async function enqueueEmail<K extends TemplateKey>(
  template: K,
  to: string,
  payload: TemplatePayloads[K],
  opts: EnqueueOptions = {},
) {
  const runner = opts.tx ?? db;
  await runner
    .insert(schema.notifications)
    .values({
      template,
      channel: "email",
      toAddress: to.trim().toLowerCase(),
      payload: payload as Record<string, unknown>,
      orderId: opts.orderId ?? null,
      dedupeKey: opts.dedupeKey ?? null,
      scheduledFor: opts.scheduledFor ?? new Date(),
    })
    .onConflictDoNothing({ target: schema.notifications.dedupeKey });
}

/** Sends one admin alert per configured admin address. */
export async function enqueueAdminEmail<K extends TemplateKey>(
  template: K,
  recipients: string[],
  payload: TemplatePayloads[K],
  opts: Omit<EnqueueOptions, "dedupeKey"> & { dedupeKey?: string } = {},
) {
  for (const to of recipients) {
    await enqueueEmail(template, to, payload, {
      ...opts,
      dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:${to.toLowerCase()}` : undefined,
    });
  }
}

/**
 * Claims due notifications (FOR UPDATE SKIP LOCKED so concurrent workers never double-send),
 * renders and sends them. Failures are retried with exponential backoff up to MAX_ATTEMPTS.
 */
export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const claimed = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.status, "queued"), lte(schema.notifications.scheduledFor, new Date())))
      .orderBy(schema.notifications.scheduledFor)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];
    return tx
      .update(schema.notifications)
      .set({ status: "sending", attempts: sql`${schema.notifications.attempts} + 1` })
      .where(inArray(schema.notifications.id, due.map((d) => d.id)))
      .returning();
  });

  let sent = 0;
  let failed = 0;
  const provider = getEmailProvider();
  for (const n of claimed) {
    try {
      const rendered = await renderTemplate(n.template as TemplateKey, n.payload as never);
      const [html, text] = await Promise.all([render(rendered.element), render(rendered.element, { plainText: true })]);
      const res = await provider.send({
        to: n.toAddress,
        subject: rendered.subject,
        html,
        text,
        replyTo: rendered.replyTo,
        attachments: rendered.attachments,
      });
      await db
        .update(schema.notifications)
        .set({ status: "sent", sentAt: new Date(), providerMessageId: res.id, lastError: null, payload: { ...n.payload, subject: rendered.subject } })
        .where(eq(schema.notifications.id, n.id));
      sent++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      const giveUp = n.attempts >= MAX_ATTEMPTS;
      await db
        .update(schema.notifications)
        .set({
          status: giveUp ? "failed" : "queued",
          lastError: message.slice(0, 1000),
          scheduledFor: new Date(Date.now() + 2 ** n.attempts * 60_000),
        })
        .where(eq(schema.notifications.id, n.id));
      console.error(`[outbox] ${n.template} → ${n.toAddress} failed (attempt ${n.attempts}): ${message}`);
    }
  }
  return { sent, failed };
}

/** Re-queues stuck "sending" rows (e.g. a crashed invocation) older than 15 minutes. */
export async function recoverStuckNotifications() {
  await db
    .update(schema.notifications)
    .set({ status: "queued" })
    .where(and(eq(schema.notifications.status, "sending"), lte(schema.notifications.updatedAt, new Date(Date.now() - 15 * 60_000))));
}
