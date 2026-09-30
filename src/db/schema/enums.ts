import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["participant", "staff", "admin", "super_admin"]);

export const courseStatus = pgEnum("course_status", ["draft", "published", "archived"]);

export const deliveryFormat = pgEnum("delivery_format", ["in_person", "online", "hybrid"]);

export const runStatus = pgEnum("run_status", [
  "draft",
  "open",
  "full",
  "closed",
  "completed",
  "cancelled",
]);

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "awaiting_verification",
  "paid",
  "cancelled",
  "expired",
  "refunded",
  "partially_refunded",
]);

/** How the buyer intends to pay. `channel` = one of the admin-managed payment channels (GCash, QR Ph, bank). */
export const paymentMethod = pgEnum("payment_method", ["channel", "bill_company"]);

export const paymentStatus = pgEnum("payment_status", [
  "submitted",
  "verified",
  "rejected",
  "refunded",
]);

export const paymentChannelKind = pgEnum("payment_channel_kind", ["ewallet", "qrph", "bank"]);

export const registrationStatus = pgEnum("registration_status", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "waitlisted",
  "attended",
  "completed",
]);

export const rewardType = pgEnum("reward_type", ["percent", "fixed_per_seat"]);

export const referralRewardStatus = pgEnum("referral_reward_status", [
  "pending",
  "approved",
  "paid",
  "void",
]);

export const notificationChannel = pgEnum("notification_channel", ["email", "sms"]);

export const notificationStatus = pgEnum("notification_status", [
  "queued",
  "sending",
  "sent",
  "failed",
  "cancelled",
]);

export const publishStatus = pgEnum("publish_status", ["draft", "published"]);

export const inquiryType = pgEnum("inquiry_type", ["contact", "corporate"]);

export const inquiryStatus = pgEnum("inquiry_status", ["new", "in_progress", "closed"]);
