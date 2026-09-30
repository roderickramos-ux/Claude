import { asc } from "drizzle-orm";
import { AdminForm, ConfirmForm } from "@/components/admin/admin-form";
import { CheckField, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { AdminHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { deleteFaq, saveFaq } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "FAQs" };

export default async function FaqsAdmin() {
  await requireRole("admin");
  const [faqs, courses] = await Promise.all([
    db.query.faqs.findMany({ orderBy: [asc(schema.faqs.category), asc(schema.faqs.sortOrder)] }),
    db.query.courses.findMany({ columns: { id: true, title: true } }),
  ]);
  const courseOptions = [{ value: "", label: "General (FAQ page)" }, ...courses.map((c) => ({ value: c.id, label: `Course: ${c.title}` }))];
  const fields = (f?: (typeof faqs)[number]) => (
    <>
      {f && <input type="hidden" name="id" value={f.id} />}
      <TextField name="question" label="Question" defaultValue={f?.question} required />
      <TextAreaField name="answer" label="Answer" markdown rows={3} defaultValue={f?.answer} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="category" label="Category" defaultValue={f?.category ?? "General"} hint="“Registration” FAQs also appear on course pages" />
        <SelectField name="courseId" label="Shown on" defaultValue={f?.courseId} options={courseOptions} />
        <TextField name="sortOrder" label="Sort order" type="number" defaultValue={f?.sortOrder ?? 0} />
      </div>
      <CheckField name="isPublished" label="Published" defaultChecked={f?.isPublished ?? true} />
    </>
  );
  return (
    <>
      <AdminHeader title="FAQs" />
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.id} className="rounded-xl border border-border bg-surface">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
              <span className="font-medium text-ink">{f.question}</span>
              <span className="flex gap-2"><Badge>{f.category}</Badge>{!f.isPublished && <Badge tone="warning">hidden</Badge>}</span>
            </summary>
            <div className="border-t border-border p-4">
              <AdminForm action={saveFaq}>{fields(f)}</AdminForm>
              <ConfirmForm action={deleteFaq} confirm="Delete this FAQ?" className="mt-3">
                <input type="hidden" name="id" value={f.id} />
                <Button type="submit" size="sm" variant="ghost" className="text-danger">Delete</Button>
              </ConfirmForm>
            </div>
          </details>
        ))}
      </div>
      <Card className="mt-8 p-6">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">Add FAQ</h2>
        <AdminForm action={saveFaq} submitLabel="Add FAQ" resetOnSuccess>{fields()}</AdminForm>
      </Card>
    </>
  );
}
