import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { AdminHeader, Empty, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("staff");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const where: SQL[] = [];
  if (status && (schema.orderStatus.enumValues as readonly string[]).includes(status)) {
    where.push(eq(schema.orders.status, status as (typeof schema.orderStatus.enumValues)[number]));
  }
  if (q) {
    const like = `%${q}%`;
    where.push(or(ilike(schema.orders.orderNumber, like), ilike(schema.orders.buyerName, like), ilike(schema.orders.buyerEmail, like))!);
  }
  const orders = await db.query.orders.findMany({
    where: where.length ? and(...where) : undefined,
    orderBy: [desc(schema.orders.createdAt)],
    limit: 200,
    with: { items: true },
  });

  return (
    <>
      <AdminHeader title="Orders & payments" description="Verify offline payments, manage holds and refunds." />
      <form className="mb-5 flex flex-col gap-2 sm:flex-row" method="get">
        <Input name="q" defaultValue={q} placeholder="Search order no., name or email" className="sm:max-w-xs" />
        <Select name="status" defaultValue={status} className="sm:max-w-56">
          <option value="">All statuses</option>
          {schema.orderStatus.enumValues.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      {orders.length === 0 ? (
        <Empty>No orders found.</Empty>
      ) : (
        <Table>
          <thead>
            <tr><th>Order</th><th>Buyer</th><th>Seats</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.orderNumber}</Link></td>
                <td>{o.buyerName}<span className="block text-xs text-ink-muted">{o.billing.company ?? o.buyerEmail}</span></td>
                <td>{o.items.reduce((s, i) => s + i.seats, 0)}</td>
                <td>{formatPHP(o.totalCentavos)}</td>
                <td className="text-ink-muted">{o.paymentMethod === "bill_company" ? "Bill company" : o.paymentChannel?.label}</td>
                <td><OrderStatusBadge status={o.status} /></td>
                <td className="whitespace-nowrap text-ink-muted">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
