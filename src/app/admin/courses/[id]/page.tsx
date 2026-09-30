import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/admin/course-form";
import { AdminHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Edit course" };

export default async function CourseEdit({ params, searchParams }: PageProps<"/admin/courses/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [course, categories, faculty] = await Promise.all([
    isNew ? undefined : db.query.courses.findFirst({ where: eq(schema.courses.id, id), with: { faculty: true } }),
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
    db.query.faculty.findMany({ orderBy: [asc(schema.faculty.sortOrder)] }),
  ]);
  if (!isNew && !course) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/courses" className="text-ink-muted hover:text-primary">← Courses</Link></p>
      <AdminHeader
        title={course ? course.title : "New course"}
        actions={course && (
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/courses/${course.slug}`} target="_blank">Preview ↗</Link></Button>
            <Button asChild size="sm"><Link href={`/admin/runs/new?course=${course.id}`}>Schedule a batch</Link></Button>
          </>
        )}
      />
      {sp.created && <Alert tone="success" className="mb-6">Course created.</Alert>}
      <CourseForm course={course} categories={categories} faculty={faculty} selectedFaculty={course?.faculty.map((f) => f.facultyId) ?? []} />
    </>
  );
}
