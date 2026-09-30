import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db/client";
import { defaultSettings, siteSettingsSchema, type SiteSettings } from "@/lib/settings-schema";

/** Site settings for the current request (merged over defaults). */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const row = await db.query.siteSettings.findFirst({ where: eq(schema.siteSettings.id, 1) });
  const parsed = siteSettingsSchema.safeParse(row?.data ?? {});
  const settings = parsed.success ? parsed.data : defaultSettings;
  if (settings.adminNotificationEmails.length === 0 && process.env.ADMIN_NOTIFICATION_EMAILS) {
    settings.adminNotificationEmails = process.env.ADMIN_NOTIFICATION_EMAILS.split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }
  return settings;
});

export async function saveSettings(data: SiteSettings) {
  const parsed = siteSettingsSchema.parse(data);
  await db
    .insert(schema.siteSettings)
    .values({ id: 1, data: parsed })
    .onConflictDoUpdate({ target: schema.siteSettings.id, set: { data: parsed, updatedAt: new Date() } });
}
