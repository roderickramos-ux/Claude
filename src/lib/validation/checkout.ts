import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^\+?\d{10,15}$/.test(v), "Enter a valid mobile number, e.g. 0917 123 4567");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

export const attendeeSchema = z.object({
  fullName: trimmed(120).min(2, "Enter the attendee's full name"),
  email: emailSchema,
  mobile: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/[\s()-]/g, "") : undefined))
    .refine((v) => !v || /^\+?\d{10,15}$/.test(v), "Enter a valid mobile number"),
  jobTitle: optional(120),
  organizationName: optional(160),
  dietaryNeeds: optional(300),
  accessibilityNeeds: optional(300),
});

export const checkoutSchema = z
  .object({
    buyer: z.object({
      fullName: trimmed(120).min(2, "Enter your full name"),
      email: emailSchema,
      mobile: mobileSchema,
    }),
    billing: z.object({
      name: optional(160),
      company: optional(160),
      address: optional(300),
      tin: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v ? v : undefined))
        .refine((v) => !v || /^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/.test(v), "TIN format: 000-000-000-000"),
    }),
    lines: z
      .array(
        z.object({
          runId: z.string().uuid(),
          attendees: z.array(attendeeSchema).min(1).max(50),
        }),
      )
      .min(1, "Your cart is empty")
      .max(10),
    paymentMethod: z.enum(["channel", "bill_company"]),
    channelCode: optional(40),
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => !v || /^[A-Z0-9-]{3,32}$/.test(v), "Invalid referral code"),
    agreeTerms: z.literal(true, { error: "Please agree to the Terms and Privacy Policy to continue" }),
    marketingOptIn: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "channel" && !v.channelCode) {
      ctx.addIssue({ code: "custom", path: ["channelCode"], message: "Choose how you will pay" });
    }
    if (v.paymentMethod === "bill_company") {
      if (!v.billing.company) ctx.addIssue({ code: "custom", path: ["billing", "company"], message: "Company name is required for billing" });
      if (!v.billing.address) ctx.addIssue({ code: "custom", path: ["billing", "address"], message: "Billing address is required" });
    }
    const seen = new Set<string>();
    for (const l of v.lines) {
      if (seen.has(l.runId)) ctx.addIssue({ code: "custom", path: ["lines"], message: "Duplicate batch in cart" });
      seen.add(l.runId);
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const paymentProofSchema = z.object({
  channelCode: trimmed(40).min(1, "Choose the payment channel you used"),
  amount: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(/[₱,\s]/g, "")))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 10_000_000, "Enter the amount you paid"),
  referenceNumber: trimmed(80).min(3, "Enter the reference number from your receipt"),
  payerName: optional(120),
});

/** Flattens zod issues into { "buyer.email": "message" } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
