import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/catalog/course-card";
import { formatLabel } from "@/components/catalog/labels";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { Container } from "@/components/ui/misc";
import { formatMonthYear } from "@/lib/dates";
import { listCategories, listPublishedCourses } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Courses",
  description: "Short, intensive professional training programs in project management, data management and leadership, led by doctorate-level faculty.",
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const category = one(sp.category);
  const format = one(sp.format);
  const month = one(sp.month);

  const [courses, categories] = await Promise.all([listPublishedCourses(), listCategories()]);
  const months = [...new Set(courses.flatMap((c) => c.runs.map((r) => r.startDate.slice(0, 7))))].sort();

  const filtered = courses.filter((c) => {
    if (category && c.category?.slug !== category) return false;
    if (format && !(c.defaultFormat === format || c.runs.some((r) => r.format === format))) return false;
    if (month && !c.runs.some((r) => r.startDate.startsWith(month))) return false;
    return true;
  });
  const active = Boolean(category || format || month);

  return (
    <>
      <PageHeader eyebrow="Programs" title="Courses" lead="Intensive programs of 2–5 days, in person, online or hybrid, each led by doctorate-level faculty." />
      <Container className="py-12">
        <form className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4 sm:items-end" method="get">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="format">Format</Label>
            <Select id="format" name="format" defaultValue={format}>
              <option value="">Any format</option>
              {Object.entries(formatLabel).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="month">Month</Label>
            <Select id="month" name="month" defaultValue={month}>
              <option value="">Any month</option>
              {months.map((m) => (
                <option key={m} value={m}>{formatMonthYear(`${m}-01`)}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Filter</Button>
            {active && (
              <Button asChild variant="ghost">
                <Link href="/courses">Clear</Link>
              </Button>
            )}
          </div>
        </form>

        {filtered.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-lg text-ink">No programs match these filters yet.</p>
            <p className="mt-2 text-ink-muted">New programs are added regularly. <Link href="/contact" className="text-primary underline">Tell us what you&apos;re looking for</Link>.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
