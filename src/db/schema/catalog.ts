import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { centavos, id, timestamps, tstz } from "./columns";
import { courseStatus, deliveryFormat, runStatus } from "./enums";

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const courses = pgTable(
  "courses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    tagline: text("tagline"),
    /** Short plain-text summary for cards and meta descriptions. */
    summary: text("summary"),
    /** Markdown. */
    description: text("description"),
    outcomes: text("outcomes").array().notNull().default([]),
    whoShouldAttend: text("who_should_attend").array().notNull().default([]),
    /** Markdown. */
    prerequisites: text("prerequisites"),
    /** Markdown: modules as headings, topics as bullet lists. */
    outline: text("outline"),
    durationDays: integer("duration_days").notNull().default(1),
    defaultFormat: deliveryFormat("default_format").notNull().default("in_person"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    coverImagePath: text("cover_image_path"),
    brochurePath: text("brochure_path"),
    status: courseStatus("status").notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Marks sample/placeholder copy so it is easy to find and replace before launch. */
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("courses_status_idx").on(t.status)],
);

export const faculty = pgTable("faculty", {
  id: id(),
  slug: text("slug").notNull().unique(),
  honorific: text("honorific"),
  fullName: text("full_name").notNull(),
  postNominals: text("post_nominals"),
  positionTitle: text("position_title"),
  credentials: text("credentials").array().notNull().default([]),
  /** Markdown. */
  bio: text("bio"),
  photoPath: text("photo_path"),
  specializations: text("specializations").array().notNull().default([]),
  linkedinUrl: text("linkedin_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  ...timestamps,
});

export const courseFaculty = pgTable(
  "course_faculty",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.facultyId] })],
);

export type SessionMode = "in_person" | "online";

/** One training day. Times are Asia/Manila wall-clock times ("HH:MM"). */
export type RunSession = {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  mode: SessionMode;
  /** e.g. "BGC, Taguig" or "Zoom". Shown publicly. */
  location?: string;
};

export const courseRuns = pgTable(
  "course_runs",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    /** Human-friendly batch code, e.g. PPM-2026-11. */
    code: text("code").notNull().unique(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    sessions: jsonb("sessions").$type<RunSession[]>().notNull().default([]),
    format: deliveryFormat("format").notNull(),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    venueMapUrl: text("venue_map_url"),
    /** Online meeting details. Only shown to confirmed attendees. */
    onlineDetails: text("online_details"),
    capacity: integer("capacity").notNull(),
    regularPriceCentavos: centavos("regular_price_centavos").notNull(),
    earlyBirdPercent: integer("early_bird_percent").notNull().default(0),
    earlyBirdDeadline: tstz("early_bird_deadline"),
    groupMinSeats: integer("group_min_seats").notNull().default(3),
    groupDiscountPercent: integer("group_discount_percent").notNull().default(0),
    /** When false (default) a line gets the better of early-bird or group rate, not both. */
    stackDiscounts: boolean("stack_discounts").notNull().default(false),
    registrationDeadline: tstz("registration_deadline"),
    status: runStatus("status").notNull().default("draft"),
    /** Markdown: "what to prepare", sent in reminders. */
    preparationNotes: text("preparation_notes"),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("course_runs_course_idx").on(t.courseId),
    index("course_runs_start_idx").on(t.startDate),
  ],
);

export const runFaculty = pgTable(
  "run_faculty",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => courseRuns.id, { onDelete: "cascade" }),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.runId, t.facultyId] })],
);
