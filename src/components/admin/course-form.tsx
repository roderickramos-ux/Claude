import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, CheckboxGroup, FileField, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { FormSection } from "@/components/admin/ui";
import { Card } from "@/components/ui/misc";
import type { CourseRow, FacultyRow } from "@/server/queries/catalog";
import { saveCourse } from "@/server/actions/admin/catalog";
import { publicFileUrl } from "@/server/storage";

export function CourseForm({
  course,
  categories,
  faculty,
  selectedFaculty,
}: {
  course?: CourseRow;
  categories: { id: string; name: string }[];
  faculty: FacultyRow[];
  selectedFaculty: string[];
}) {
  return (
    <Card className="p-6 sm:p-8">
      <AdminForm action={saveCourse} className="grid">
        {course && <input type="hidden" name="id" value={course.id} />}
        <FormSection title="Basics" description="Shown on course cards and the course page header.">
          <TextField name="title" label="Title" defaultValue={course?.title} required />
          <TextField name="slug" label="URL slug" defaultValue={course?.slug} hint="Leave blank to generate from the title. Changing it breaks old links." />
          <TextField name="tagline" label="Tagline" defaultValue={course?.tagline} />
          <TextAreaField name="summary" label="Short summary" defaultValue={course?.summary} rows={2} hint="One or two sentences for cards and search results." />
          <div className="grid gap-5 sm:grid-cols-3">
            <SelectField name="status" label="Status" defaultValue={course?.status ?? "draft"} options={[{ value: "draft", label: "Draft (hidden)" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
            <SelectField name="defaultFormat" label="Format" defaultValue={course?.defaultFormat ?? "hybrid"} options={[{ value: "in_person", label: "In person" }, { value: "online", label: "Live online" }, { value: "hybrid", label: "Hybrid" }]} />
            <TextField name="durationDays" label="Duration (days)" type="number" defaultValue={course?.durationDays ?? 2} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField name="categoryId" label="Category" defaultValue={course?.categoryId} options={[{ value: "", label: "None" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
            <TextField name="sortOrder" label="Sort order" type="number" defaultValue={course?.sortOrder ?? 0} />
          </div>
        </FormSection>
        <FormSection title="Content" description="Course copy. Replace any [PLACEHOLDER] text before launch.">
          <TextAreaField name="description" label="Overview" markdown rows={10} defaultValue={course?.description} />
          <TextAreaField name="outcomes" label="Learning outcomes" rows={6} defaultValue={course?.outcomes.join("\n")} hint="One outcome per line." />
          <TextAreaField name="whoShouldAttend" label="Who should attend" rows={4} defaultValue={course?.whoShouldAttend.join("\n")} hint="One per line." />
          <TextAreaField name="prerequisites" label="Prerequisites" markdown rows={3} defaultValue={course?.prerequisites} />
          <TextAreaField name="outline" label="Outline / modules" markdown rows={14} defaultValue={course?.outline} hint="Use ### for each day or module and - for topics." />
        </FormSection>
        <FormSection title="Media" description="Cover image (16:9, at least 1600×900) and downloadable brochure.">
          <FileField name="coverImage" label="Cover image" accept="image/jpeg,image/png,image/webp" current={publicFileUrl(course?.coverImagePath)} removeName="removeCover" />
          <FileField name="brochure" label="Brochure (PDF)" accept="application/pdf" current={publicFileUrl(course?.brochurePath)} removeName="removeBrochure" />
        </FormSection>
        <FormSection title="Faculty" description="Default faculty shown on the course page (batches can override).">
          <CheckboxGroup name="facultyIds" label="Faculty" options={faculty.map((f) => ({ value: f.id, label: `${f.honorific ?? ""} ${f.fullName}`.trim() }))} selected={selectedFaculty} />
        </FormSection>
        <FormSection title="SEO" description="Search and social previews. Defaults to title and summary.">
          <TextField name="seoTitle" label="SEO title" defaultValue={course?.seoTitle} />
          <TextAreaField name="seoDescription" label="Meta description" rows={2} defaultValue={course?.seoDescription} hint="About 150 characters." />
          <CheckField name="isPlaceholder" label="Contains placeholder content" defaultChecked={course?.isPlaceholder} hint="Shows a reminder to staff on the course page." />
        </FormSection>
      </AdminForm>
    </Card>
  );
}
