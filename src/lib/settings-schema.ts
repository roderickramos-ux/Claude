import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//.test(v), "Must start with http:// or https://")
  .default("");

export const siteSettingsSchema = z.object({
  businessName: z.string().trim().min(1).default("Praxis Center for Advanced Management"),
  shortName: z.string().trim().min(1).default("Praxis Center"),
  tagline: z
    .string()
    .trim()
    .default("Doctorate-led professional training, built for practice."),
  /** Storage paths (public bucket). Empty = text wordmark. */
  logoPath: z.string().default(""),
  logoLightPath: z.string().default(""),
  contactEmail: z.string().trim().default(""),
  contactPhone: z.string().trim().default(""),
  address: z.string().trim().default(""),
  businessTin: z.string().trim().default(""),
  /** Printed on acknowledgments and invoices. */
  taxNote: z.string().trim().default("Non-VAT registered"),
  socials: z
    .object({
      facebook: optionalUrl,
      linkedin: optionalUrl,
      instagram: optionalUrl,
      youtube: optionalUrl,
      tiktok: optionalUrl,
      messenger: optionalUrl,
      viber: z.string().trim().default(""),
    })
    .default({
      facebook: "",
      linkedin: "",
      instagram: "",
      youtube: "",
      tiktok: "",
      messenger: "",
      viber: "",
    }),
  /** Who receives admin alerts (new order, proof uploaded, inquiry). */
  adminNotificationEmails: z.array(z.string().trim().email()).default([]),
  dpo: z
    .object({ name: z.string().trim().default(""), email: z.string().trim().default("") })
    .default({ name: "", email: "" }),
  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().trim().default(""),
      href: z.string().trim().default(""),
    })
    .default({ enabled: false, text: "", href: "" }),
  orderNumberPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{1,12}$/, "Uppercase letters, digits and dashes only")
    .default("PCAM"),
  /** Seats are held for unpaid offline orders for this many days. */
  paymentHoldDays: z.coerce.number().int().min(1).max(30).default(5),
  /** Payment instructions shown for "Bill my company" (Markdown). */
  billCompanyInstructions: z
    .string()
    .default(
      "We will email a proforma invoice to your billing contact. Seats are held while we await payment. Please settle via any of our payment channels and upload the proof of payment on your order page.",
    ),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const defaultSettings: SiteSettings = siteSettingsSchema.parse({});
