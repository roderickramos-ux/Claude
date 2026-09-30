import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import type { PricingBreakdown } from "../../lib/pricing/types";
import { courseRuns } from "./catalog";
import { centavos, id, timestamps, tstz } from "./columns";
import {
  orderStatus,
  paymentChannelKind,
  paymentMethod,
  paymentStatus,
  referralRewardStatus,
  registrationStatus,
  rewardType,
} from "./enums";
import { organizations, profiles } from "./identity";

/** Admin-managed ways to pay offline: GCash, QR Ph, BPI QR/bank transfer, etc. */
export const paymentChannels = pgTable("payment_channels", {
  id: id(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  kind: paymentChannelKind("kind").notNull(),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  qrImagePath: text("qr_image_path"),
  /** Markdown. */
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const referralCodes = pgTable("referral_codes", {
  id: id(),
  /** Stored uppercase. */
  code: text("code").notNull().unique(),
  referrerName: text("referrer_name").notNull(),
  referrerEmail: text("referrer_email"),
  referrerMobile: text("referrer_mobile"),
  rewardType: rewardType("reward_type").notNull().default("fixed_per_seat"),
  /** Percent (0–100) or centavos per paid seat, depending on reward_type. */
  rewardValue: integer("reward_value").notNull().default(0),
  /** Optional discount for the buyer who uses the code (percent). */
  buyerDiscountPercent: integer("buyer_discount_percent").notNull().default(0),
  maxUses: integer("max_uses"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  ...timestamps,
});

export type UtmData = Partial<
  Record<"source" | "medium" | "campaign" | "term" | "content" | "referrer" | "landing", string>
>;

export type BillingSnapshot = {
  name: string;
  company?: string;
  address?: string;
  tin?: string;
};

export type PaymentChannelSnapshot = {
  code: string;
  label: string;
  kind: string;
  accountName?: string | null;
  accountNumber?: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number").notNull().unique(),
    status: orderStatus("status").notNull().default("pending_payment"),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerMobile: text("buyer_mobile").notNull(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    billing: jsonb("billing").$type<BillingSnapshot>().notNull(),
    paymentMethod: paymentMethod("payment_method").notNull(),
    paymentChannel: jsonb("payment_channel").$type<PaymentChannelSnapshot>(),
    subtotalCentavos: centavos("subtotal_centavos").notNull(),
    discountCentavos: centavos("discount_centavos").notNull().default(0),
    totalCentavos: centavos("total_centavos").notNull(),
    pricing: jsonb("pricing").$type<PricingBreakdown>().notNull(),
    referralCodeId: uuid("referral_code_id").references(() => referralCodes.id, {
      onDelete: "set null",
    }),
    referralCode: text("referral_code"),
    utm: jsonb("utm").$type<UtmData>().notNull().default({}),
    privacyConsentAt: tstz("privacy_consent_at").notNull(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    /** Seats are held until this time while the order is unpaid. */
    paymentDueAt: tstz("payment_due_at").notNull(),
    paidAt: tstz("paid_at"),
    cancelledAt: tstz("cancelled_at"),
    cancelReason: text("cancel_reason"),
    /** Configurable receipt number, left empty until BIR numbering is confirmed. */
    receiptNumber: text("receipt_number"),
    adminNotes: text("admin_notes"),
    reminderSentAt: tstz("reminder_sent_at"),
    ...timestamps,
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_buyer_email_idx").on(t.buyerEmail),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => courseRuns.id, { onDelete: "restrict" }),
    /** Snapshot of the course/run name at purchase time. */
    label: text("label").notNull(),
    seats: integer("seats").notNull(),
    regularUnitCentavos: centavos("regular_unit_centavos").notNull(),
    unitPriceCentavos: centavos("unit_price_centavos").notNull(),
    priceBasis: text("price_basis").notNull(),
    discountCentavos: centavos("discount_centavos").notNull().default(0),
    lineTotalCentavos: centavos("line_total_centavos").notNull(),
    ...timestamps,
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_run_idx").on(t.runId)],
);

export const attendees = pgTable(
  "attendees",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    jobTitle: text("job_title"),
    organizationName: text("organization_name"),
    dietaryNeeds: text("dietary_needs"),
    accessibilityNeeds: text("accessibility_needs"),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("attendees_email_idx").on(t.email)],
);

export const registrations = pgTable(
  "registrations",
  {
    id: id(),
    runId: uuid("run_id")
      .notNull()
      .references(() => courseRuns.id, { onDelete: "restrict" }),
    attendeeId: uuid("attendee_id")
      .notNull()
      .unique()
      .references(() => attendees.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: registrationStatus("status").notNull().default("pending_payment"),
    confirmedAt: tstz("confirmed_at"),
    cancelledAt: tstz("cancelled_at"),
    ...timestamps,
  },
  (t) => [
    index("registrations_run_status_idx").on(t.runId, t.status),
    index("registrations_order_idx").on(t.orderId),
  ],
);

/** A payment submitted by the buyer (proof + reference) or recorded by an admin. */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    channelCode: text("channel_code"),
    amountCentavos: centavos("amount_centavos").notNull(),
    referenceNumber: text("reference_number"),
    payerName: text("payer_name"),
    proofPath: text("proof_path"),
    status: paymentStatus("status").notNull().default("submitted"),
    /** Provider fields for future online gateways (PayMongo/Xendit). */
    provider: text("provider").notNull().default("manual"),
    providerRef: text("provider_ref"),
    verifiedBy: uuid("verified_by").references(() => profiles.id, { onDelete: "set null" }),
    verifiedAt: tstz("verified_at"),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const refunds = pgTable("refunds", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amountCentavos: centavos("amount_centavos").notNull(),
  reason: text("reason"),
  method: text("method"),
  reference: text("reference"),
  processedBy: uuid("processed_by").references(() => profiles.id, { onDelete: "set null" }),
  ...timestamps,
});

export const referralRewards = pgTable("referral_rewards", {
  id: id(),
  referralCodeId: uuid("referral_code_id")
    .notNull()
    .references(() => referralCodes.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  amountCentavos: centavos("amount_centavos").notNull(),
  status: referralRewardStatus("status").notNull().default("pending"),
  paidAt: tstz("paid_at"),
  notes: text("notes"),
  ...timestamps,
});

/** Atomic sequences for order/receipt numbering (e.g. key "order:2026"). */
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: bigint("value", { mode: "number" }).notNull().default(0),
});
