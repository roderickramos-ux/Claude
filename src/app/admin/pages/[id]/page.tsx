import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { AdminHeader } from "@/components/admin/ui";
import { Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { savePage } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Edit page" };

export default async function PageEdit({ params }: PageProps<"/admin/pages/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const page = isNew ? undefined : await db.query.pages.findFirst({ where: eq(schema.pages.id, id) });
  if (!isNew && !page) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/pages" className="text-ink-muted hover:text-primary">← Pages</Link></p>
      <AdminHeader title={page?.title ?? "New page"} description={page && <Link href={`/${page.slug}`} target="_blank" className="text-primary underline">View /{page.slug} ↗</Link>} />
      <Card className="p-6 sm:p-8">
        <AdminForm action={savePage}>
          {page && <input type="hidden" name="id" value={page.id} />}
          <div className="grid gap-5 sm:grid-cols-[1fr_14rem_10rem]">
            <TextField name="title" label="Title" defaultValue={page?.title} required />
            <TextField name="slug" label="URL slug" defaultValue={page?.slug} required hint="e.g. privacy → /privacy" />
            <SelectField name="status" label="Status" defaultValue={page?.status ?? "draft"} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} />
          </div>
          <TextAreaField name="body" label="Content" markdown rows={24} defaultValue={page?.body} />
          <TextAreaField name="seoDescription" label="Meta description" rows={2} defaultValue={page?.seoDescription} />
          <CheckField name="isPlaceholder" label="Still a draft / placeholder text" defaultChecked={page?.isPlaceholder} />
        </AdminForm>
      </Card>
    </>
  );
}
