"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { emailSchema, fieldErrors } from "@/lib/validation/checkout";
import { readCart, writeCart, MAX_SEATS_PER_LINE } from "../cart";
import { flushOutboxAfterResponse } from "../notifications/flush";
import { enqueueAdminEmail, enqueueEmail } from "../notifications/outbox";
import { rateLimit } from "../ratelimit";
import { getSettings } from "../settings";
import { verifyTurnstile } from "../turnstile";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

const subscribeSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().max(120).optional(),
  interests: z.array(z.string().max(60)).max(10).default([]),
  consent: z.literal("on", { error: "Please agree to receive emails from us" }),
  source: z.string().max(40).default("website"),
});

export async function subscribe(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thank you!" }; // honeypot
  const rl = await rateLimit("subscribe", 5, 600);
  if (!rl.ok) return { message: "Too many attempts. Please try again in a few minutes." };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { message: "Please complete the verification." };

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName") || undefined,
    interests: formData.getAll("interests"),
    consent: formData.get("consent"),
    source: formData.get("source") || "website",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email, fullName, interests, source } = parsed.data;

  const [row] = await db
    .insert(schema.subscribers)
    .values({ email, fullName, interests, source, consentAt: new Date(), unsubscribeToken: crypto.randomUUID() })
    .onConflictDoUpdate({
      target: schema.subscribers.email,
      set: { unsubscribedAt: null, consentAt: new Date(), interests, ...(fullName && { fullName }) },
    })
    .returning();
  await enqueueEmail("subscriber_welcome", email, { name: fullName }, { dedupeKey: `subscriber_welcome:${row.id}` });
  flushOutboxAfterResponse();
  return { ok: true, message: "Thank you! We'll be in touch with program news and early-bird offers." };
}

const inquirySchema = z.object({
  type: z.enum(["contact", "corporate"]),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  headcount: z.coerce.number().int().min(1).max(10000).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  consent: z.literal("on", { error: "Please agree to our Privacy Policy" }),
});

export async function submitInquiry(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thank you!" };
  const rl = await rateLimit("inquiry", 5, 600);
  if (!rl.ok) return { message: "Too many messages. Please try again later." };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) return { message: "Please complete the verification." };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { consent: _consent, ...data } = parsed.data;
  void _consent;

  const [inquiry] = await db.insert(schema.inquiries).values(data).returning();
  const settings = await getSettings();
  await enqueueAdminEmail("admin_inquiry", settings.adminNotificationEmails, { inquiryId: inquiry.id }, {
    dedupeKey: `admin_inquiry:${inquiry.id}`,
  });
  flushOutboxAfterResponse();
  return {
    ok: true,
    message:
      data.type === "corporate"
        ? "Thank you! Our team will contact you within one business day to discuss your training needs."
        : "Thank you for your message. We'll get back to you within one business day.",
  };
}

// ── Cart ─────────────────────────────────────────────────────

const seatsSchema = z.coerce.number().int().min(1).max(MAX_SEATS_PER_LINE);

export async function addToCart(formData: FormData) {
  const runId = z.string().uuid().parse(formData.get("runId"));
  const seats = seatsSchema.parse(formData.get("seats") ?? 1);
  const run = await db.query.courseRuns.findFirst({ where: eq(schema.courseRuns.id, runId) });
  if (!run || run.status !== "open") redirect("/courses");
  const cart = await readCart();
  await writeCart([...cart, { runId, seats }]);
  redirect("/cart");
}

export async function updateCartLine(formData: FormData) {
  const runId = z.string().uuid().parse(formData.get("runId"));
  const seats = z.coerce.number().int().min(0).max(MAX_SEATS_PER_LINE).parse(formData.get("seats"));
  const cart = await readCart();
  await writeCart(cart.map((l) => (l.runId === runId ? { ...l, seats } : l)).filter((l) => l.seats > 0));
}

export async function removeCartLine(formData: FormData) {
  const runId = z.string().uuid().parse(formData.get("runId"));
  const cart = await readCart();
  await writeCart(cart.filter((l) => l.runId !== runId));
}
