import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { duplicateRun } from "@/server/actions/admin/catalog";
import { requireRole } from "@/server/auth/session";
import { withAvailability } from "@/server/queries/catalog";

export const metadata = { title: "Batches" };

export default async function RunsAdmin() {
  await requireRole("admin");
  const rows = await db
    .select({ run: schema.courseRuns, title: schema.courses.title })
    .from(schema.courseRuns)
    .innerJoin(schema.courses, eq(schema.courseRuns.courseId, schema.courses.id))
    .orderBy(desc(schema.courseRuns.startDate));
  const runs = await withAvailability(rows.map((r) => r.run));
  return (
    <>
      <AdminHeader title="Batches (course runs)" description="Scheduled offerings of a course, with dates, venue, capacity and pricing." actions={<Button asChild><Link href="/admin/runs/new">New batch</Link></Button>} />
      <Table>
        <thead><tr><th>Batch</th><th>Dates</th><th>Seats</th><th>Price</th><th>Status</th><th /></tr></thead>
        <tbody>
          {runs.map((r, i) => (
            <tr key={r.id}>
              <td><Link href={`/admin/runs/${r.id}`} className="font-medium text-primary hover:underline">{rows[i].title}</Link><span className="block text-xs text-ink-muted">{r.code}</span></td>
              <td className="whitespace-nowrap">{formatDate(r.startDate)}<span className="block text-xs text-ink-muted">to {formatDate(r.endDate)}</span></td>
              <td>{r.seatsTaken}/{r.capacity}</td>
              <td>{formatPHP(r.regularPriceCentavos)}{r.earlyBirdPercent > 0 && <span className="block text-xs text-ink-muted">EB {r.earlyBirdPercent}%</span>}</td>
              <td><Badge tone={r.status === "open" ? "success" : r.status === "draft" ? "warning" : "neutral"}>{r.status}</Badge></td>
              <td className="text-right">
                <div className="flex justify-end gap-3 text-sm">
                  <Link href={`/admin/registrations?run=${r.id}`} className="text-primary">Participants</Link>
                  <form action={duplicateRun}><input type="hidden" name="id" value={r.id} /><button className="text-primary" type="submit">Duplicate</button></form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
