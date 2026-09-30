import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, FileField, TextAreaField, TextField } from "@/components/admin/fields";
import { AdminHeader, FormSection } from "@/components/admin/ui";
import { Alert, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { saveFaculty } from "@/server/actions/admin/catalog";
import { requireRole } from "@/server/auth/session";
import { publicFileUrl } from "@/server/storage";

export const metadata = { title: "Edit faculty" };

export default async function FacultyEdit({ params, searchParams }: PageProps<"/admin/faculty/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const f = isNew ? undefined : await db.query.faculty.findFirst({ where: eq(schema.faculty.id, id) });
  if (!isNew && !f) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/faculty" className="text-ink-muted hover:text-primary">← Faculty</Link></p>
      <AdminHeader title={f ? f.fullName : "Add faculty"} />
      {sp.created && <Alert tone="success" className="mb-6">Profile created.</Alert>}
      <Card className="p-6 sm:p-8">
        <AdminForm action={saveFaculty} className="grid">
          {f && <input type="hidden" name="id" value={f.id} />}
          <FormSection title="Name & title">
            <div className="grid gap-5 sm:grid-cols-[8rem_1fr_10rem]">
              <TextField name="honorific" label="Honorific" defaultValue={f?.honorific ?? "Dr."} />
              <TextField name="fullName" label="Full name" defaultValue={f?.fullName} required />
              <TextField name="postNominals" label="Post-nominals" defaultValue={f?.postNominals} placeholder="PhD, PMP" />
            </div>
            <TextField name="positionTitle" label="Position / role" defaultValue={f?.positionTitle} placeholder="Lead Faculty, Project Management" />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="slug" label="URL slug" defaultValue={f?.slug} hint="Auto-generated if blank" />
              <TextField name="sortOrder" label="Sort order" type="number" defaultValue={f?.sortOrder ?? 0} />
            </div>
          </FormSection>
          <FormSection title="Profile">
            <FileField name="photo" label="Photo (square, at least 600×600)" accept="image/jpeg,image/png,image/webp" current={publicFileUrl(f?.photoPath)} removeName="removePhoto" />
            <TextAreaField name="bio" label="Bio" markdown rows={8} defaultValue={f?.bio} />
            <TextAreaField name="credentials" label="Degrees & credentials" rows={4} defaultValue={f?.credentials.join("\n")} hint="One per line, e.g. PhD in Management, University of the Philippines" />
            <TextField name="specializations" label="Specializations" defaultValue={f?.specializations.join(", ")} hint="Comma-separated" />
            <TextField name="linkedinUrl" label="LinkedIn URL" defaultValue={f?.linkedinUrl} />
          </FormSection>
          <FormSection title="Visibility">
            <CheckField name="isPublished" label="Show on the website" defaultChecked={f?.isPublished ?? true} />
            <CheckField name="isPlaceholder" label="Contains placeholder content" defaultChecked={f?.isPlaceholder} />
          </FormSection>
        </AdminForm>
      </Card>
    </>
  );
}
