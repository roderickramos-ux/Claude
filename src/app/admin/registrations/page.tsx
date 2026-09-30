import Link from "next/link";
import { RegistrationStatusBadge } from "@/components/admin/status";
import { AdminHeader, Empty, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { schema } from "@/db/client";
import { formatDate } from "@/lib/dates";
import { requireRole } from "@/server/auth/session";
import { listRegistrations, listRunsForSelect } from "@/server/queries/admin";

export const metadata = { title: "Registrations" };

export default async function RegistrationsPage({ searchParams }: PageProps<"/admin/registrations">) {
  await requireRole("staff");
  const sp = await searchParams;
  const runId = typeof sp.run === "string" && /^[0-9a-f-]{36}$/.test(sp.run) ? sp.run : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const [rows, runs] = await Promise.all([listRegistrations({ runId, status }), listRunsForSelect()]);
  const qs = new URLSearchParams({ ...(runId && { run: runId }), ...(status && { status }) }).toString();

  return (
    <>
      <AdminHeader
        title="Registrations"
        description={`${rows.length} participants`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><a href={`/admin/registrations/export?${qs}`}>Export CSV (Excel)</a></Button>
            {runId && <Button asChild variant="outline" size="sm"><Link href={`/admin/runs/${runId}/attendance`} target="_blank">Print attendance sheet</Link></Button>}
          </>
        }
      />
      <form className="mb-5 flex flex-col gap-2 sm:flex-row" method="get">
        <Select name="run" defaultValue={runId ?? ""} className="sm:max-w-sm">
          <option value="">All batches</option>
          {runs.map((r) => <option key={r.id} value={r.id}>{r.title}: {r.code} ({formatDate(r.startDate)})</option>)}
        </Select>
        <Select name="status" defaultValue={status ?? ""} className="sm:max-w-48">
          <option value="">All statuses</option>
          {schema.registrationStatus.enumValues.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </Select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      {rows.length === 0 ? <Empty>No registrations yet.</Empty> : (
        <Table>
          <thead><tr><th>Participant</th><th>Organization</th><th>Batch</th><th>Order</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.attendee.fullName}<span className="block text-xs text-ink-muted">{r.attendee.email}{r.attendee.mobile && ` · ${r.attendee.mobile}`}</span></td>
                <td className="text-ink-muted">{r.attendee.organizationName ?? r.company.company ?? "—"}{r.attendee.jobTitle && <span className="block text-xs">{r.attendee.jobTitle}</span>}</td>
                <td>{r.courseTitle}<span className="block text-xs text-ink-muted">{r.runCode}</span></td>
                <td><Link href={`/admin/orders/${r.orderId}`} className="text-primary hover:underline">{r.orderNumber}</Link><span className="block text-xs text-ink-muted">{r.buyerName}</span></td>
                <td><RegistrationStatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
