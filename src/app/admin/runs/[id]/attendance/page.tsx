import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db/client";
import { formatDate } from "@/lib/dates";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Attendance sheet" };

/** Printable sign-in sheet: one signature column per session. */
export default async function AttendanceSheet({ params }: PageProps<"/admin/runs/[id]/attendance">) {
  await requireRole("staff");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const run = await db.query.courseRuns.findFirst({ where: eq(schema.courseRuns.id, id), with: { course: true } });
  if (!run) notFound();
  const rows = await db
    .select({ a: schema.attendees })
    .from(schema.registrations)
    .innerJoin(schema.attendees, eq(schema.registrations.attendeeId, schema.attendees.id))
    .where(and(eq(schema.registrations.runId, id), inArray(schema.registrations.status, ["confirmed", "attended", "completed"])))
    .orderBy(asc(schema.attendees.fullName));

  return (
    <div className="bg-white p-6 text-black print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 12mm } aside, header { display:none !important } }`}</style>
      <h1 className="font-heading text-2xl">{run.course.title}: Attendance</h1>
      <p className="text-sm">Batch {run.code} · {run.venueName ?? ""}</p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-left">#</th>
            <th className="border border-black px-2 py-1 text-left">Name</th>
            <th className="border border-black px-2 py-1 text-left">Organization</th>
            {run.sessions.map((s, i) => (
              <th key={s.date} className="border border-black px-2 py-1">Day {i + 1}<br /><span className="font-normal">{formatDate(s.date)}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ a }, i) => (
            <tr key={a.id}>
              <td className="border border-black px-2 py-3">{i + 1}</td>
              <td className="border border-black px-2 py-3">{a.fullName}</td>
              <td className="border border-black px-2 py-3">{a.organizationName ?? ""}</td>
              {run.sessions.map((s) => <td key={s.date} className="w-28 border border-black" />)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-4 text-sm">No confirmed participants yet.</p>}
    </div>
  );
}
