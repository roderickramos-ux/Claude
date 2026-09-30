import { desc } from "drizzle-orm";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { retryFailedNotifications } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Email log" };

export default async function NotificationsPage() {
  await requireRole("admin");
  const rows = await db.query.notifications.findMany({ orderBy: [desc(schema.notifications.createdAt)], limit: 200 });
  const failed = rows.filter((r) => r.status === "failed").length;
  return (
    <>
      <AdminHeader
        title="Email log"
        description={`Every email the system sends. Failed sends retry automatically up to 5 times.${process.env.RESEND_API_KEY ? "" : " Resend is not configured, so emails are only logged to the server console."}`}
        actions={failed > 0 && <form action={retryFailedNotifications}><Button type="submit" size="sm">Retry {failed} failed</Button></form>}
      />
      <Table>
        <thead><tr><th>Template</th><th>To</th><th>Status</th><th>Attempts</th><th>Created</th><th>Sent</th></tr></thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id}>
              <td>{n.template.replace(/_/g, " ")}{typeof n.payload.subject === "string" && <span className="block text-xs text-ink-muted">{n.payload.subject}</span>}</td>
              <td>{n.toAddress}</td>
              <td><Badge tone={n.status === "sent" ? "success" : n.status === "failed" ? "danger" : "warning"}>{n.status}</Badge>{n.lastError && <span className="block max-w-xs truncate text-xs text-danger" title={n.lastError}>{n.lastError}</span>}</td>
              <td>{n.attempts}</td>
              <td className="whitespace-nowrap text-ink-muted">{formatDateTime(n.createdAt)}</td>
              <td className="whitespace-nowrap text-ink-muted">{n.sentAt ? formatDateTime(n.sentAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
