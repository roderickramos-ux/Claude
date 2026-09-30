import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/status";
import { AdminHeader, StatCard, Table } from "@/components/admin/ui";
import { Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDate, formatDateTime, formatMonthYear, manilaYmd } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Dashboard" };

const { orders, registrations, courseRuns, courses, subscribers, inquiries } = schema;

export default async function Dashboard() {
  await requireRole("staff");
  const paidStatuses = ["paid", "partially_refunded"] as const;

  const [[revenue], [pending], [awaiting], [subs], [newInquiries], runs, byCourse, byMonth, sources, recent] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${orders.totalCentavos}),0)::bigint`, n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, [...paidStatuses])),
    db.select({ total: sql<number>`coalesce(sum(${orders.totalCentavos}),0)::bigint`, n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending_payment")),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "awaiting_verification")),
    db.select({ n: sql<number>`count(*)::int` }).from(subscribers).where(sql`${subscribers.unsubscribedAt} is null`),
    db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, "new")),
    db
      .select({
        id: courseRuns.id,
        code: courseRuns.code,
        title: courses.title,
        startDate: courseRuns.startDate,
        capacity: courseRuns.capacity,
        status: courseRuns.status,
        confirmed: sql<number>`count(${registrations.id}) filter (where ${registrations.status} in ('confirmed','attended','completed'))::int`,
        pending: sql<number>`count(${registrations.id}) filter (where ${registrations.status} = 'pending_payment')::int`,
      })
      .from(courseRuns)
      .innerJoin(courses, eq(courseRuns.courseId, courses.id))
      .leftJoin(registrations, eq(registrations.runId, courseRuns.id))
      .where(gte(courseRuns.endDate, manilaYmd()))
      .groupBy(courseRuns.id, courses.title)
      .orderBy(courseRuns.startDate),
    db
      .select({ title: courses.title, total: sql<number>`coalesce(sum(${schema.orderItems.lineTotalCentavos}),0)::bigint`, seats: sql<number>`coalesce(sum(${schema.orderItems.seats}),0)::int` })
      .from(schema.orderItems)
      .innerJoin(orders, eq(schema.orderItems.orderId, orders.id))
      .innerJoin(courseRuns, eq(schema.orderItems.runId, courseRuns.id))
      .innerJoin(courses, eq(courseRuns.courseId, courses.id))
      .where(inArray(orders.status, [...paidStatuses]))
      .groupBy(courses.title),
    db
      .select({ month: sql<string>`to_char(${orders.paidAt} at time zone 'Asia/Manila', 'YYYY-MM')`, total: sql<number>`sum(${orders.totalCentavos})::bigint` })
      .from(orders)
      .where(and(inArray(orders.status, [...paidStatuses])))
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)
      .limit(6),
    db
      .select({ source: sql<string>`coalesce(${orders.utm}->>'source', ${orders.utm}->>'referrer', 'direct')`, n: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`)
      .limit(6),
    db.query.orders.findMany({ orderBy: [desc(orders.createdAt)], limit: 8 }),
  ]);

  return (
    <>
      <AdminHeader title="Dashboard" description={`Today is ${formatDate(new Date())} (Manila time).`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Revenue (paid)" value={formatPHP(Number(revenue.total))} hint={`${revenue.n} paid orders`} href="/admin/orders?status=paid" />
        <StatCard label="To verify" value={awaiting.n} hint="Proofs uploaded" href="/admin/orders?status=awaiting_verification" />
        <StatCard label="Awaiting payment" value={pending.n} hint={`${formatPHP(Number(pending.total))} on hold`} href="/admin/orders?status=pending_payment" />
        <StatCard label="Subscribers" value={subs.n} hint="Newsletter & notify-me" href="/admin/leads" />
        <StatCard label="New inquiries" value={newInquiries.n} href="/admin/leads" />
      </div>

      <h2 className="mb-3 mt-10 font-sans text-lg font-semibold text-ink">Upcoming batches</h2>
      <Table>
        <thead><tr><th>Batch</th><th>Starts</th><th>Status</th><th>Confirmed</th><th>Pending</th><th>Fill rate</th></tr></thead>
        <tbody>
          {runs.map((r) => {
            const pct = Math.round(((r.confirmed + r.pending) / Math.max(1, r.capacity)) * 100);
            return (
              <tr key={r.id}>
                <td><Link href={`/admin/registrations?run=${r.id}`} className="font-medium text-primary hover:underline">{r.title}</Link><span className="block text-xs text-ink-muted">{r.code}</span></td>
                <td>{formatDate(r.startDate)}</td>
                <td className="capitalize">{r.status}</td>
                <td>{r.confirmed}</td>
                <td>{r.pending}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    <span className="text-xs text-ink-muted">{r.confirmed + r.pending}/{r.capacity}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-sans text-base font-semibold text-ink">Revenue by course</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byCourse.length === 0 && <li className="text-ink-muted">No paid orders yet.</li>}
            {byCourse.map((c) => <li key={c.title} className="flex justify-between gap-3"><span>{c.title} <span className="text-ink-muted">({c.seats} seats)</span></span><span className="font-medium">{formatPHP(Number(c.total))}</span></li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-sans text-base font-semibold text-ink">Revenue by month</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byMonth.length === 0 && <li className="text-ink-muted">No paid orders yet.</li>}
            {byMonth.filter((m) => m.month).map((m) => <li key={m.month} className="flex justify-between"><span>{formatMonthYear(`${m.month}-01`)}</span><span className="font-medium">{formatPHP(Number(m.total))}</span></li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-sans text-base font-semibold text-ink">Order sources (UTM)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sources.length === 0 && <li className="text-ink-muted">No orders yet.</li>}
            {sources.map((s) => <li key={s.source} className="flex justify-between gap-3"><span className="truncate">{s.source}</span><span className="font-medium">{s.n}</span></li>)}
          </ul>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 font-sans text-lg font-semibold text-ink">Recent orders</h2>
      <Table>
        <thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead>
        <tbody>
          {recent.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.orderNumber}</Link></td>
              <td>{o.buyerName}</td>
              <td>{formatPHP(o.totalCentavos)}</td>
              <td><OrderStatusBadge status={o.status} /></td>
              <td className="text-ink-muted">{formatDateTime(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
