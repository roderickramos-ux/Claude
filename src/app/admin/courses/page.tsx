import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { saveCategory } from "@/server/actions/admin/catalog";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Courses" };

export default async function CoursesAdmin() {
  await requireRole("admin");
  const [courses, categories] = await Promise.all([
    db.query.courses.findMany({ orderBy: [asc(schema.courses.sortOrder), asc(schema.courses.title)], with: { category: true, runs: true } }),
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
  ]);
  return (
    <>
      <AdminHeader title="Courses" description="The programs in your catalog. Schedule batches under Batches." actions={<Button asChild><Link href="/admin/courses/new">New course</Link></Button>} />
      <Table>
        <thead><tr><th>Course</th><th>Category</th><th>Batches</th><th>Status</th><th /></tr></thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/admin/courses/${c.id}`} className="font-medium text-primary hover:underline">{c.title}</Link>
                {c.isPlaceholder && <Badge tone="warning" className="ml-2">placeholder copy</Badge>}
                <span className="block text-xs text-ink-muted">/courses/{c.slug}</span>
              </td>
              <td className="text-ink-muted">{c.category?.name ?? "—"}</td>
              <td>{c.runs.length}</td>
              <td><Badge tone={c.status === "published" ? "success" : c.status === "draft" ? "warning" : "neutral"}>{c.status}</Badge></td>
              <td className="text-right"><Link href={`/courses/${c.slug}`} target="_blank" className="text-sm text-primary">Preview ↗</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Card className="mt-8 max-w-lg p-6">
        <h2 className="font-sans text-base font-semibold text-ink">Categories</h2>
        <p className="mt-1 text-sm text-ink-muted">{categories.map((c) => c.name).join(", ") || "None yet"}</p>
        <AdminForm action={saveCategory} submitLabel="Add category" resetOnSuccess className="mt-4 grid gap-3">
          <TextField name="name" label="New category name" />
        </AdminForm>
      </Card>
    </>
  );
}
