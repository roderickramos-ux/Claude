import { desc } from "drizzle-orm";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { setInquiryStatus } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  await requireRole("staff");
  const [inquiries, subs] = await Promise.all([
    db.query.inquiries.findMany({ orderBy: [desc(schema.inquiries.createdAt)], limit: 200 }),
    db.query.subscribers.findMany({ orderBy: [desc(schema.subscribers.createdAt)], limit: 500 }),
  ]);
  return (
    <>
      <AdminHeader
        title="Leads & inquiries"
        actions={
          <Button asChild variant="outline" size="sm">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download route */}
            <a href="/admin/leads/export">Export subscribers CSV</a>
          </Button>
        }
      />
      <h2 className="mb-3 font-sans text-lg font-semibold text-ink">Inquiries</h2>
      <div className="space-y-3">
        {inquiries.length === 0 && <p className="text-sm text-ink-muted">No inquiries yet.</p>}
        {inquiries.map((q) => (
          <details key={q.id} className="rounded-xl border border-border bg-surface">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
              <span><strong className="text-ink">{q.name}</strong> <span className="text-ink-muted">· {q.company ?? q.email}</span></span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                {formatDateTime(q.createdAt)}
                <Badge tone={q.type === "corporate" ? "accent" : "neutral"}>{q.type}</Badge>
                <Badge tone={q.status === "new" ? "warning" : q.status === "closed" ? "neutral" : "primary"}>{q.status.replace("_", " ")}</Badge>
              </span>
            </summary>
            <div className="space-y-3 border-t border-border p-4 text-sm">
              <p className="text-ink-muted"><a href={`mailto:${q.email}`} className="text-primary underline">{q.email}</a>{q.phone && ` · ${q.phone}`}{q.headcount && ` · ${q.headcount} participants`}</p>
              <p className="whitespace-pre-wrap text-ink">{q.message}</p>
              <div className="flex gap-2">
                {(["in_progress", "closed"] as const).filter((s) => s !== q.status).map((s) => (
                  <form key={s} action={setInquiryStatus}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value={s} /><Button size="sm" variant="outline" type="submit">Mark {s.replace("_", " ")}</Button></form>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-sans text-lg font-semibold text-ink">Subscribers ({subs.filter((s) => !s.unsubscribedAt).length})</h2>
      <Table>
        <thead><tr><th>Email</th><th>Name</th><th>Interests</th><th>Source</th><th>Signed up</th></tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className={s.unsubscribedAt ? "opacity-50" : undefined}>
              <td>{s.email}</td>
              <td>{s.fullName ?? "—"}</td>
              <td className="text-ink-muted">{s.interests.join(", ") || "—"}</td>
              <td className="text-ink-muted">{s.source}</td>
              <td className="text-ink-muted">{formatDateTime(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
