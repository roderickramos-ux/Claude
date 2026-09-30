"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { siteSettingsSchema } from "@/lib/settings-schema";
import { pesosToCentavos } from "@/lib/money";
import { processOutbox } from "../../notifications/outbox";
import { getSettings, saveSettings } from "../../settings";
import { bool, guarded, maybeUpload, optStr, str, type ActionState } from "./helpers";

const uuid = z.string().uuid();
const RESERVED = ["admin", "api", "courses", "calendar", "faculty", "faq", "contact", "corporate", "cart", "checkout", "orders", "login", "auth", "coming-soon", "preview", "styleguide"];

// ── Pages ────────────────────────────────────────────────────

export async function savePage(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const slug = z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
      .refine((s) => !RESERVED.includes(s), "This URL is reserved")
      .parse(str(fd, "slug"));
    const values = {
      slug,
      title: z.string().trim().min(2).max(160).parse(str(fd, "title")),
      body: str(fd, "body"),
      seoDescription: optStr(fd, "seoDescription"),
      status: z.enum(schema.publishStatus.enumValues).parse(fd.get("status")),
      isPlaceholder: bool(fd, "isPlaceholder"),
    };
    let pid = id;
    if (pid) await db.update(schema.pages).set(values).where(eq(schema.pages.id, pid));
    else pid = (await db.insert(schema.pages).values(values).returning({ id: schema.pages.id }))[0].id;
    revalidatePath(`/${slug}`);
    if (!id) redirect(`/admin/pages/${pid}`);
    return { ok: true, message: "Page saved." };
  });
}

// ── FAQs ─────────────────────────────────────────────────────

export async function saveFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const values = {
      question: z.string().trim().min(5, "Enter the question").max(300).parse(str(fd, "question")),
      answer: z.string().trim().min(2, "Enter the answer").parse(str(fd, "answer")),
      category: str(fd, "category") || "General",
      courseId: optStr(fd, "courseId"),
      sortOrder: z.coerce.number().int().parse(fd.get("sortOrder") || 0),
      isPublished: bool(fd, "isPublished"),
    };
    if (id) await db.update(schema.faqs).set(values).where(eq(schema.faqs.id, id));
    else await db.insert(schema.faqs).values(values);
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
    return { ok: true, message: id ? "FAQ saved." : "FAQ added." };
  });
}

export async function deleteFaq(fd: FormData) {
  await guarded("admin", async () => {
    await db.delete(schema.faqs).where(eq(schema.faqs.id, uuid.parse(fd.get("id"))));
    revalidatePath("/admin/faqs");
  });
}

// ── Payment channels ─────────────────────────────────────────

export async function savePaymentChannel(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const values = {
      code: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, "Short code: letters, numbers, dashes").parse(str(fd, "code")),
      label: z.string().trim().min(2).max(80).parse(str(fd, "label")),
      kind: z.enum(schema.paymentChannelKind.enumValues).parse(fd.get("kind")),
      accountName: optStr(fd, "accountName"),
      accountNumber: optStr(fd, "accountNumber"),
      instructions: optStr(fd, "instructions"),
      isActive: bool(fd, "isActive"),
      sortOrder: z.coerce.number().int().parse(fd.get("sortOrder") || 0),
    };
    const qr = await maybeUpload(fd, "qrImage", "public", "payment-qr", { images: true });
    const set = { ...values, ...(qr && { qrImagePath: qr }), ...(bool(fd, "removeQr") && { qrImagePath: null }) };
    if (id) await db.update(schema.paymentChannels).set(set).where(eq(schema.paymentChannels.id, id));
    else await db.insert(schema.paymentChannels).values(set);
    revalidatePath("/admin/payment-channels");
    return { ok: true, message: "Payment channel saved." };
  });
}

// ── Site settings ────────────────────────────────────────────

export async function saveSiteSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const current = await getSettings();
    const logo = await maybeUpload(fd, "logo", "public", "brand", { images: true, svg: true });
    const logoLight = await maybeUpload(fd, "logoLight", "public", "brand", { images: true, svg: true });
    const next = siteSettingsSchema.parse({
      ...current,
      businessName: str(fd, "businessName"),
      shortName: str(fd, "shortName") || current.shortName,
      tagline: str(fd, "tagline"),
      logoPath: bool(fd, "removeLogo") ? "" : (logo ?? current.logoPath),
      logoLightPath: bool(fd, "removeLogoLight") ? "" : (logoLight ?? current.logoLightPath),
      contactEmail: str(fd, "contactEmail"),
      contactPhone: str(fd, "contactPhone"),
      address: str(fd, "address"),
      businessTin: str(fd, "businessTin"),
      taxNote: str(fd, "taxNote"),
      socials: {
        facebook: str(fd, "facebook"),
        linkedin: str(fd, "linkedin"),
        instagram: str(fd, "instagram"),
        youtube: str(fd, "youtube"),
        tiktok: str(fd, "tiktok"),
        messenger: str(fd, "messenger"),
        viber: str(fd, "viber"),
      },
      adminNotificationEmails: str(fd, "adminNotificationEmails").split(/[,\s]+/).filter(Boolean),
      dpo: { name: str(fd, "dpoName"), email: str(fd, "dpoEmail") },
      announcement: { enabled: bool(fd, "announcementEnabled"), text: str(fd, "announcementText"), href: str(fd, "announcementHref") },
      orderNumberPrefix: str(fd, "orderNumberPrefix").toUpperCase(),
      paymentHoldDays: str(fd, "paymentHoldDays"),
      billCompanyInstructions: str(fd, "billCompanyInstructions"),
    });
    await saveSettings(next);
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  });
}

// ── Referrals ────────────────────────────────────────────────

export async function saveReferralCode(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const rewardType = z.enum(schema.rewardType.enumValues).parse(fd.get("rewardType"));
    const rawReward = str(fd, "rewardValue") || "0";
    const values = {
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/, "3–32 letters, numbers or dashes").parse(str(fd, "code")),
      referrerName: z.string().trim().min(2, "Enter the referrer's name").max(120).parse(str(fd, "referrerName")),
      referrerEmail: optStr(fd, "referrerEmail")?.toLowerCase() ?? null,
      referrerMobile: optStr(fd, "referrerMobile"),
      rewardType,
      rewardValue: rewardType === "percent" ? z.coerce.number().int().min(0).max(100).parse(rawReward) : pesosToCentavos(rawReward),
      buyerDiscountPercent: z.coerce.number().int().min(0).max(50).parse(fd.get("buyerDiscountPercent") || 0),
      maxUses: fd.get("maxUses") ? z.coerce.number().int().min(1).parse(fd.get("maxUses")) : null,
      isActive: bool(fd, "isActive"),
      notes: optStr(fd, "notes"),
    };
    if (id) await db.update(schema.referralCodes).set(values).where(eq(schema.referralCodes.id, id));
    else await db.insert(schema.referralCodes).values(values);
    revalidatePath("/admin/referrals");
    return { ok: true, message: id ? "Referral code saved." : `Referral code ${values.code} created.` };
  });
}

export async function setRewardStatus(fd: FormData) {
  await guarded("admin", async () => {
    const status = z.enum(schema.referralRewardStatus.enumValues).parse(fd.get("status"));
    await db
      .update(schema.referralRewards)
      .set({ status, paidAt: status === "paid" ? new Date() : null })
      .where(eq(schema.referralRewards.id, uuid.parse(fd.get("id"))));
    revalidatePath("/admin/referrals");
  });
}

// ── Leads ────────────────────────────────────────────────────

export async function setInquiryStatus(fd: FormData) {
  await guarded("staff", async () => {
    const status = z.enum(schema.inquiryStatus.enumValues).parse(fd.get("status"));
    await db.update(schema.inquiries).set({ status }).where(eq(schema.inquiries.id, uuid.parse(fd.get("id"))));
    revalidatePath("/admin/leads");
  });
}

// ── Users ────────────────────────────────────────────────────

export async function setUserRole(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("super_admin", async (me) => {
    const id = uuid.parse(fd.get("id"));
    const role = z.enum(schema.userRole.enumValues).parse(fd.get("role"));
    if (id === me.id && role !== "super_admin") throw new Error("You cannot remove your own super admin role.");
    await db.update(schema.profiles).set({ role }).where(eq(schema.profiles.id, id));
    revalidatePath("/admin/users");
    return { ok: true, message: "Role updated." };
  });
}

export async function inviteStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("super_admin", async () => {
    const email = z.string().trim().toLowerCase().email().parse(fd.get("email"));
    const role = z.enum(["staff", "admin", "super_admin"]).parse(fd.get("role"));
    await db
      .insert(schema.profiles)
      .values({ id: crypto.randomUUID(), email, role })
      .onConflictDoUpdate({ target: schema.profiles.email, set: { role } });
    revalidatePath("/admin/users");
    return { ok: true, message: `${email} can now sign in at /login with the ${role.replace("_", " ")} role.` };
  });
}

// ── Notifications ────────────────────────────────────────────

export async function retryFailedNotifications(fd: FormData) {
  await guarded("admin", async () => {
    const ids = fd.getAll("id").map(String).filter((v) => uuid.safeParse(v).success);
    await db
      .update(schema.notifications)
      .set({ status: "queued", attempts: 0, scheduledFor: new Date() })
      .where(ids.length ? inArray(schema.notifications.id, ids) : and(eq(schema.notifications.status, "failed")));
    await processOutbox(25);
    revalidatePath("/admin/notifications");
  });
}
