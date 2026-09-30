import { formatDateTime } from "@/lib/dates";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import { listRegistrations, toCsv } from "@/server/queries/admin";

export async function GET(request: Request) {
  if (!hasRole(await getCurrentUser(), "staff")) return new Response("Forbidden", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const runId = sp.get("run") && /^[0-9a-f-]{36}$/.test(sp.get("run")!) ? sp.get("run")! : undefined;
  const rows = await listRegistrations({ runId, status: sp.get("status") ?? undefined });
  const csv = toCsv([
    ["Course", "Batch", "Participant", "Email", "Mobile", "Job title", "Organization", "Dietary", "Accessibility", "Registration status", "Order", "Order status", "Buyer", "Registered at"],
    ...rows.map((r) => [
      r.courseTitle, r.runCode, r.attendee.fullName, r.attendee.email, r.attendee.mobile, r.attendee.jobTitle,
      r.attendee.organizationName ?? r.company.company, r.attendee.dietaryNeeds, r.attendee.accessibilityNeeds,
      r.status, r.orderNumber, r.orderStatus, r.buyerName, formatDateTime(r.createdAt),
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
