import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { requireRole } from "@/server/auth/session";
import { facultyDisplayName } from "@/server/queries/catalog";

export const metadata = { title: "Faculty" };

export default async function FacultyAdmin() {
  await requireRole("admin");
  const list = await db.query.faculty.findMany({ orderBy: [asc(schema.faculty.sortOrder), asc(schema.faculty.fullName)] });
  return (
    <>
      <AdminHeader title="Faculty" description="Profiles shown on the Faculty page and course pages." actions={<Button asChild><Link href="/admin/faculty/new">Add faculty</Link></Button>} />
      <Table>
        <thead><tr><th>Name</th><th>Position</th><th>Status</th></tr></thead>
        <tbody>
          {list.map((f) => (
            <tr key={f.id}>
              <td><Link href={`/admin/faculty/${f.id}`} className="font-medium text-primary hover:underline">{facultyDisplayName(f)}</Link>{f.isPlaceholder && <Badge tone="warning" className="ml-2">placeholder</Badge>}</td>
              <td className="text-ink-muted">{f.positionTitle}</td>
              <td><Badge tone={f.isPublished ? "success" : "neutral"}>{f.isPublished ? "published" : "hidden"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
