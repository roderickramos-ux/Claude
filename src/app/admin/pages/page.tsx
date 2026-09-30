import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requireRole("admin");
  const pages = await db.query.pages.findMany({ orderBy: [asc(schema.pages.slug)] });
  return (
    <>
      <AdminHeader title="Pages & policies" description="About, Privacy Policy, Terms, Refund Policy and any other simple pages." actions={<Button asChild><Link href="/admin/pages/new">New page</Link></Button>} />
      <Table>
        <thead><tr><th>Title</th><th>URL</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/pages/${p.id}`} className="font-medium text-primary hover:underline">{p.title}</Link>{p.isPlaceholder && <Badge tone="warning" className="ml-2">draft copy</Badge>}</td>
              <td><Link href={`/${p.slug}`} target="_blank" className="text-ink-muted hover:text-primary">/{p.slug} ↗</Link></td>
              <td><Badge tone={p.status === "published" ? "success" : "neutral"}>{p.status}</Badge></td>
              <td className="text-ink-muted">{formatDateTime(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
