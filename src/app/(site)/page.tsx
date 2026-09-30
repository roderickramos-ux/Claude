import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Countdown } from "@/components/catalog/countdown";
import { CourseCard } from "@/components/catalog/course-card";
import { FacultyCard } from "@/components/catalog/faculty-card";
import { formatLabel } from "@/components/catalog/labels";
import { PriceTag } from "@/components/catalog/price";
import { locationSummary, scheduleSummary } from "@/components/catalog/schedule";
import { SeatsLeft } from "@/components/catalog/seats";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, SectionHeading } from "@/components/ui/misc";
import { manilaDateTime } from "@/lib/dates";
import { listPublishedCourses, listPublishedFaculty, listUpcomingRuns } from "@/server/queries/catalog";

const pillars = [
  {
    icon: GraduationCap,
    title: "Doctorate-level faculty",
    body: "Every program is led by scholar-practitioners who hold doctorates and have delivered results in industry and government.",
  },
  {
    icon: BookOpenCheck,
    title: "Built for application",
    body: "Workshops, case clinics and ready-to-use templates. You work on your own projects and leave with outputs you can use on Monday.",
  },
  {
    icon: Users,
    title: "Small cohorts",
    body: "Seats are capped so faculty can coach every participant, with plenty of time for your questions.",
  },
];

export default async function HomePage() {
  const [upcoming, courses, faculty] = await Promise.all([listUpcomingRuns(), listPublishedCourses(), listPublishedFaculty()]);
  const featured = upcoming.find((u) => u.run.isBookable) ?? upcoming[0];
  const first = featured?.run.sessions[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] text-white">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[20rem] rounded-full border border-accent/25" />
        <Container className="relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-28">
          <div>
            <Eyebrow className="text-accent">Doctorate-led professional training</Eyebrow>
            <h1 className="mt-4 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              Management education you can put to work on Monday.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Short, intensive programs taught by scholar-practitioners, combining rigorous frameworks with hands-on application for
              professionals and teams across the Philippines.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href={featured ? `/courses/${featured.course.slug}` : "/courses"}>
                  Register Now <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline-light">
                <Link href="/corporate">Inquire for Your Team</Link>
              </Button>
            </div>
          </div>

          {featured && (
            <div className="rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Next program</p>
              <h2 className="mt-3 text-3xl leading-tight">{featured.course.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-accent" aria-hidden />
                  {scheduleSummary(featured.run.sessions, featured.run.startDate, featured.run.endDate)}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 text-accent" aria-hidden />
                  {formatLabel[featured.run.format]} · {locationSummary(featured.run)}
                </li>
              </ul>
              {first && (
                <Countdown to={manilaDateTime(first.date, first.start).toISOString()} className="mt-6" />
              )}
              <SeatsLeft
                seatsLeft={featured.run.seatsLeft}
                capacity={featured.run.capacity}
                status={featured.run.status}
                tone="light"
                className="mt-6"
              />
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-6">
                <PriceTag run={featured.run} tone="light" className="[&_.font-heading]:text-3xl" />
                <Button asChild variant="accent">
                  <Link href={`/courses/${featured.course.slug}#register`}>Reserve a seat</Link>
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Trust strip */}
      <div className="border-b border-border bg-surface">
        <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-5 text-sm text-ink-muted">
          <span>Doctorate-level faculty</span>
          <span aria-hidden className="hidden text-accent sm:inline">◆</span>
          <span>Practice-first workshops</span>
          <span aria-hidden className="hidden text-accent sm:inline">◆</span>
          <span>Small cohorts</span>
          <span aria-hidden className="hidden text-accent sm:inline">◆</span>
          <span>SEC-registered</span>
        </Container>
      </div>

      {/* Why Praxis */}
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Why Praxis"
            title="Where scholarship meets practice"
            lead="Praxis means theory put into action. Every program pairs research-grounded thinking with the realities of Philippine organizations."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-7">
                <span className="grid size-12 place-items-center rounded-lg bg-accent-soft text-accent-strong">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-2xl text-ink">{title}</h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Programs */}
      <section className="bg-muted/60 py-20 sm:py-24">
        <Container>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Programs" title="Upcoming programs" lead="Intensive programs of 2–5 days, in person, online or hybrid." />
            <Button asChild variant="outline">
              <Link href="/calendar">View training calendar</Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </Container>
      </section>

      {/* Faculty */}
      {faculty.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="Faculty" title="Learn from scholar-practitioners" lead="Our faculty hold doctorates and bring years of leading real projects, teams and organizations." />
              <Button asChild variant="outline">
                <Link href="/faculty">Meet the faculty</Link>
              </Button>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {faculty.slice(0, 4).map((f) => (
                <FacultyCard key={f.id} person={f} compact />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Corporate CTA */}
      <section className="py-4">
        <Container>
          <div className="grid gap-8 rounded-2xl bg-primary px-6 py-12 text-primary-ink sm:px-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <Eyebrow className="text-accent">For HR & L&D teams</Eyebrow>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">Train your team together</h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
                Group rates for 3 or more seats in the same batch, company billing, and in-house programs tailored to your
                organization&apos;s projects and processes.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button asChild size="lg" variant="accent">
                <Link href="/corporate">Inquire for Your Team</Link>
              </Button>
              <Button asChild size="lg" variant="outline-light">
                <Link href="/courses">Register a group</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Newsletter */}
      <section className="py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Stay informed"
            title="Be first to hear about new programs"
            lead="New schedules, early-bird offers and practical insights from our faculty, sent about once a month."
          />
          <NewsletterForm source="home" />
        </Container>
      </section>
    </>
  );
}
