import { boolean, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { courses } from "./catalog";
import { id, timestamps, tstz } from "./columns";
import {
  inquiryStatus,
  inquiryType,
  notificationChannel,
  notificationStatus,
  publishStatus,
} from "./enums";
import { orders } from "./commerce";
import type { SiteSettings } from "../../lib/settings-schema";

/** CMS-managed pages: About, Privacy Policy, Terms, Refund Policy, etc. Body is Markdown. */
export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  seoDescription: text("seo_description"),
  status: publishStatus("status").notNull().default("draft"),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  ...timestamps,
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  /** Markdown. */
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps,
});

/** Single-row table holding editable site-wide settings as validated JSON. */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").$type<SiteSettings>().notNull(),
  ...timestamps,
});

export const subscribers = pgTable("subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  interests: text("interests").array().notNull().default([]),
  source: text("source").notNull().default("website"),
  consentAt: tstz("consent_at").notNull(),
  unsubscribeToken: text("unsubscribe_token").notNull(),
  unsubscribedAt: tstz("unsubscribed_at"),
  ...timestamps,
});

export const inquiries = pgTable("inquiries", {
  id: id(),
  type: inquiryType("type").notNull().default("contact"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  headcount: integer("headcount"),
  message: text("message").notNull(),
  status: inquiryStatus("status").notNull().default("new"),
  ...timestamps,
});

/** Outbox + send log for every email/SMS. */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    template: text("template").notNull(),
    channel: notificationChannel("channel").notNull().default("email"),
    toAddress: text("to_address").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    status: notificationStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    scheduledFor: tstz("scheduled_for").notNull().defaultNow(),
    sentAt: tstz("sent_at"),
    /** Prevents duplicate sends of the same logical message (e.g. "payment_confirmed:<order>"). */
    dedupeKey: text("dedupe_key").unique(),
    ...timestamps,
  },
  (t) => [index("notifications_status_sched_idx").on(t.status, t.scheduledFor)],
);
