import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/catalog/cover";
import { FacultyCard } from "@/components/catalog/faculty-card";
import { formatLabel } from "@/components/catalog/labels";
import { RegisterPanel } from "@/components/catalog/register-panel";
import { SessionList } from "@/components/catalog/schedule";
import { ShareButtons } from "@/components/catalog/share-buttons";
import { Markdown } from "@/components/markdown";
import { CourseJsonLd } from "@/components/seo/json-ld";
import { Alert, Badge, Container, Eyebrow, PlaceholderNote } from "@/components/ui/misc";
import { absoluteUrl } from "@/lib/utils";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import { getCourseBySlug } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  const description = course.seoDescription ?? course.summary ?? course.tagline ?? undefined;
  return {
    title: course.seoTitle ?? course.title,
    description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: { title: course.title, description, url: `/courses/${course.slug}`, type: "website" },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10">
      <h2 className="text-3xl text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const isStaff = hasRole(user, "staff");
  const [course, settings] = await Promise.all([getCourseBySlug(slug, isStaff), getSettings()]);
  if (!course) notFound();

  const primaryRun = course.runs.find((r) => r.isBookable) ?? course.runs[0];
  const faculty = primaryRun?.facultyList.length ? primaryRun.facultyList : course.facultyList;

  return (
    <>
      {course.status !== "published" && (
        <div className="bg-warning-soft px-4 py-2 text-center text-sm text-warning">
          Preview: this course is <strong>{course.status}</strong> and not visible to the public.
        </div>
      )}
      <section className="border-b border-border bg-surface">
        <Container className="grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
              <Link href="/courses" className="hover:text-primary">Courses</Link>
              {course.category && <> / <span>{course.category.name}</span></>}
            </nav>
            <h1 className="mt-4 text-4xl leading-tight text-ink sm:text-5xl">{course.title}</h1>
            {course.tagline && <p className="mt-4 text-xl leading-relaxed text-ink-muted">{course.tagline}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="primary">{formatLabel[primaryRun?.format ?? course.defaultFormat]}</Badge>
              <Badge>{course.durationDays} {course.durationDays === 1 ? "day" : "days"}</Badge>
              {course.category && <Badge tone="accent">{course.category.name}</Badge>}
            </div>
            <div className="mt-6">
              <ShareButtons url={absoluteUrl(`/courses/${course.slug}`)} title={course.title} />
            </div>
          </div>
          <Cover path={course.coverImagePath} alt={course.title} label={course.category?.name ?? undefined} className="aspect-[16/10] rounded-xl" priority sizes="(min-width: 1024px) 40vw, 100vw" />
        </Container>
      </section>

      <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-10">
          {course.isPlaceholder && isStaff && <PlaceholderNote>This course contains placeholder copy. Edit it in Admin → Courses.</PlaceholderNote>}
          <nav aria-label="On this page" className="flex flex-wrap gap-2 text-sm">
            {[["overview", "Overview"], ["outcomes", "Outcomes"], ["outline", "Outline"], ["schedule", "Schedule"], ["faculty", "Faculty"], ["faq", "FAQ"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-border bg-surface px-3 py-1.5 text-ink-muted hover:border-primary hover:text-primary">{label}</a>
            ))}
          </nav>

          <section id="overview" className="scroll-mt-24">
            <Eyebrow className="mb-3">Overview</Eyebrow>
            <Markdown>{course.description}</Markdown>
          </section>

          {course.outcomes.length > 0 && (
            <Section id="outcomes" title="What you will be able to do">
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 rounded-lg bg-surface p-4 ring-1 ring-border">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-hidden />
                    <span className="leading-relaxed text-ink">{o}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {course.whoShouldAttend.length > 0 && (
            <Section id="audience" title="Who should attend">
              <ul className="space-y-2">
                {course.whoShouldAttend.map((w) => (
                  <li key={w} className="flex gap-3 text-ink"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{w}</li>
                ))}
              </ul>
              {course.prerequisites && (
                <div className="mt-6 rounded-lg bg-muted p-5">
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Prerequisites</h3>
                  <Markdown className="mt-2 text-base">{course.prerequisites}</Markdown>
                </div>
              )}
            </Section>
          )}

          {course.outline && (
            <Section id="outline" title="Program outline">
              <Markdown>{course.outline}</Markdown>
            </Section>
          )}

          <Section id="schedule" title="Schedule & venue">
            {course.runs.length === 0 ? (
              <p className="text-ink-muted">New dates will be announced soon. <Link href="/contact" className="text-primary underline">Ask to be notified</Link>.</p>
            ) : (
              <div className="space-y-8">
                {course.runs.map((run) => (
                  <div key={run.id}>
                    <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Batch {run.code}</h3>
                    <SessionList sessions={run.sessions} />
                    {run.venueName && (
                      <p className="mt-4 text-sm text-ink-muted">
                        <strong className="text-ink">In-person venue:</strong> {run.venueName}
                        {run.venueAddress && <>, {run.venueAddress}</>}
                        {run.venueMapUrl && <> · <a href={run.venueMapUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Map</a></>}
                      </p>
                    )}
                    {run.format !== "in_person" && (
                      <p className="mt-2 text-sm text-ink-muted"><strong className="text-ink">Online sessions:</strong> the Zoom link is emailed to confirmed participants.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {faculty.length > 0 && (
            <Section id="faculty" title="Your faculty">
              <div className="grid gap-4">
                {faculty.map((f) => <FacultyCard key={f.id} person={f} />)}
              </div>
            </Section>
          )}

          {course.faqs.length > 0 && (
            <Section id="faq" title="Frequently asked questions">
              <div className="divide-y divide-border rounded-xl border border-border bg-surface">
                {course.faqs.map((f) => (
                  <details key={f.id} className="group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                      {f.question}
                      <span className="text-accent-strong transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <Markdown className="mt-3 text-base text-ink-muted">{f.answer}</Markdown>
                  </details>
                ))}
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                See also our <Link href="/refund-policy" className="text-primary underline">Refund & Transfer Policy</Link>.
              </p>
            </Section>
          )}
        </div>

        <aside id="register" className="scroll-mt-24 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {course.runs.length > 0 ? (
            course.runs.map((run) => <RegisterPanel key={run.id} run={run} brochurePath={course.brochurePath} />)
          ) : (
            <Alert>New dates coming soon.</Alert>
          )}
          <p className="px-1 text-sm text-ink-muted">
            Registering a large group or need in-house training? <Link href="/corporate" className="text-primary underline">Inquire for your team</Link>.
          </p>
        </aside>
      </Container>
      <CourseJsonLd course={course} settings={settings} />
    </>
  );
}
