import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import { toCsv } from "@/server/queries/admin";

export async function GET() {
  if (!hasRole(await getCurrentUser(), "staff")) return new Response("Forbidden", { status: 403 });
  const subs = await db.query.subscribers.findMany({ orderBy: [desc(schema.subscribers.createdAt)] });
  const csv = toCsv([
    ["Email", "Name", "Interests", "Source", "Consent at", "Unsubscribed at"],
    ...subs.map((s) => [s.email, s.fullName, s.interests.join("; "), s.source, formatDateTime(s.consentAt), s.unsubscribedAt ? formatDateTime(s.unsubscribedAt) : ""]),
  ]);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="subscribers.csv"`, "Cache-Control": "no-store" },
  });
}
