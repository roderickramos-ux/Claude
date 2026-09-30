import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps, tstz } from "./columns";
import { userRole } from "./enums";

/**
 * One row per signed-in user. `id` matches Supabase `auth.users.id` in production;
 * it is not a foreign key so the schema also runs on plain Postgres (local dev, CI).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  mobile: text("mobile"),
  role: userRole("role").notNull().default("participant"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  lastSignInAt: tstz("last_sign_in_at"),
  ...timestamps,
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  tin: text("tin"),
  billingContactName: text("billing_contact_name"),
  billingContactEmail: text("billing_contact_email"),
  billingContactPhone: text("billing_contact_phone"),
  ...timestamps,
});
