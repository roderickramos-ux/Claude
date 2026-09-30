import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, CheckboxGroup, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { SessionsEditor } from "@/components/admin/sessions-editor";
import { AdminHeader, FormSection } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { toManilaDateTimeLocal } from "@/lib/dates";
import { centavosToPesosInput } from "@/lib/money";
import { saveRun } from "@/server/actions/admin/catalog";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Edit batch" };

export default async function RunEdit({ params, searchParams }: PageProps<"/admin/runs/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [run, courses, faculty] = await Promise.all([
    isNew ? undefined : db.query.courseRuns.findFirst({ where: eq(schema.courseRuns.id, id), with: { faculty: true, course: true } }),
    db.query.courses.findMany({ orderBy: [asc(schema.courses.title)] }),
    db.query.faculty.findMany({ orderBy: [asc(schema.faculty.sortOrder)] }),
  ]);
  if (!isNew && !run) notFound();
  const presetCourse = typeof sp.course === "string" ? sp.course : undefined;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/runs" className="text-ink-muted hover:text-primary">← Batches</Link></p>
      <AdminHeader
        title={run ? `${run.course.title}: ${run.code}` : "New batch"}
        actions={run && (
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/registrations?run=${run.id}`}>Participants</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/runs/${run.id}/attendance`} target="_blank">Attendance sheet</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/courses/${run.course.slug}`} target="_blank">Preview ↗</Link></Button>
          </>
        )}
      />
      {sp.created && <Alert tone="success" className="mb-6">Batch created. Set the status to <strong>Open</strong> to accept registrations.</Alert>}
      <Card className="p-6 sm:p-8">
        <AdminForm action={saveRun} className="grid">
          {run && <input type="hidden" name="id" value={run.id} />}
          <FormSection title="Batch" description="Status Open accepts registrations. Full/Closed stop new orders.">
            <SelectField name="courseId" label="Course" defaultValue={run?.courseId ?? presetCourse} options={courses.map((c) => ({ value: c.id, label: c.title }))} required />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField name="code" label="Batch code" defaultValue={run?.code} placeholder="PPM-2027-02" required />
              <SelectField name="status" label="Status" defaultValue={run?.status ?? "draft"} options={schema.runStatus.enumValues.map((s) => ({ value: s, label: s }))} />
              <SelectField name="format" label="Format" defaultValue={run?.format ?? "hybrid"} options={[{ value: "in_person", label: "In person" }, { value: "online", label: "Live online" }, { value: "hybrid", label: "Hybrid" }]} />
            </div>
            <SessionsEditor initial={run?.sessions ?? []} />
          </FormSection>
          <FormSection title="Venue & online" description="The online details are only sent to confirmed participants.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="venueName" label="Venue name" defaultValue={run?.venueName} />
              <TextField name="venueMapUrl" label="Google Maps link" defaultValue={run?.venueMapUrl} />
            </div>
            <TextField name="venueAddress" label="Venue address" defaultValue={run?.venueAddress} />
            <TextAreaField name="onlineDetails" label="Online session details (private)" rows={2} defaultValue={run?.onlineDetails} />
            <TextAreaField name="preparationNotes" label="What to prepare" markdown rows={3} defaultValue={run?.preparationNotes} />
          </FormSection>
          <FormSection title="Capacity & pricing" description="Early-bird is locked in when the order is placed. Group rate applies to orders with N+ seats for this batch.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="capacity" label="Capacity (seats)" type="number" defaultValue={run?.capacity ?? 30} required />
              <TextField name="regularPrice" label="Regular price per seat (₱)" defaultValue={run ? centavosToPesosInput(run.regularPriceCentavos) : ""} required />
              <TextField name="earlyBirdPercent" label="Early-bird discount (%)" type="number" defaultValue={run?.earlyBirdPercent ?? 15} />
              <TextField name="earlyBirdDeadline" label="Early-bird deadline" type="datetime-local" defaultValue={toManilaDateTimeLocal(run?.earlyBirdDeadline)} hint="Manila time" />
              <TextField name="groupMinSeats" label="Group rate minimum seats" type="number" defaultValue={run?.groupMinSeats ?? 3} />
              <TextField name="groupDiscountPercent" label="Group discount (%)" type="number" defaultValue={run?.groupDiscountPercent ?? 10} />
              <TextField name="registrationDeadline" label="Registration deadline" type="datetime-local" defaultValue={toManilaDateTimeLocal(run?.registrationDeadline)} hint="Manila time; optional" />
            </div>
            <CheckField name="stackDiscounts" label="Stack early-bird and group discounts" defaultChecked={run?.stackDiscounts} hint="Off: each line gets the better of the two. On: both apply (multiplied)." />
          </FormSection>
          <FormSection title="Faculty">
            <CheckboxGroup name="facultyIds" label="Faculty for this batch" options={faculty.map((f) => ({ value: f.id, label: `${f.honorific ?? ""} ${f.fullName}`.trim() }))} selected={run?.faculty.map((f) => f.facultyId) ?? []} />
            <CheckField name="isPlaceholder" label="Contains placeholder details (venue, price…)" defaultChecked={run?.isPlaceholder} />
          </FormSection>
        </AdminForm>
      </Card>
    </>
  );
}
