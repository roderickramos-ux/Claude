import type { Metadata } from "next";
import Link from "next/link";
import { formatLabel } from "@/components/catalog/labels";
import { PriceTag } from "@/components/catalog/price";
import { locationSummary } from "@/components/catalog/schedule";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, Container } from "@/components/ui/misc";
import { formatDate, formatDayMonth, formatMonthYear } from "@/lib/dates";
import { listUpcomingRuns } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Training Calendar",
  description: "Upcoming Praxis Center training schedules: dates, formats, venues and seats available.",
  alternates: { canonical: "/calendar" },
};

export default async function CalendarPage() {
  const runs = await listUpcomingRuns();
  const byMonth = new Map<string, typeof runs>();
  for (const r of runs) {
    const key = r.run.startDate.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), r]);
  }
  return (
    <>
      <PageHeader eyebrow="Schedule" title="Training calendar" lead="All upcoming public batches. Seats are limited to keep cohorts small." />
      <Container className="py-12">
        {runs.length === 0 && <p className="text-ink-muted">New schedules are coming soon.</p>}
        <div className="space-y-12">
          {[...byMonth].map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-5 text-3xl text-ink">{formatMonthYear(`${month}-01`)}</h2>
              <div className="grid gap-4">
                {list.map(({ run, course }) => (
                  <Card key={run.id} className="grid gap-5 p-5 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:p-6">
                    <div className="flex items-baseline gap-2 sm:block sm:text-center">
                      <p className="font-heading text-4xl leading-none text-primary">{formatDayMonth(run.startDate).split(" ")[0]}</p>
                      <p className="text-sm uppercase tracking-wide text-ink-muted">{formatDayMonth(run.startDate).split(" ")[1]}</p>
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge tone="primary">{formatLabel[run.format]}</Badge>
                        {run.isBookable ? (
                          <Badge tone={run.seatsLeft <= 5 ? "danger" : "success"}>{run.seatsLeft} seats left</Badge>
                        ) : (
                          <Badge tone="danger">{run.seatsLeft <= 0 ? "Fully booked" : "Closed"}</Badge>
                        )}
                      </div>
                      <h3 className="text-2xl text-ink">
                        <Link href={`/courses/${course.slug}`} className="hover:text-primary">{course.title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {run.sessions.map((s) => formatDate(s.date).replace(/, \d{4}$/, "")).join(" · ") || `${formatDate(run.startDate)} – ${formatDate(run.endDate)}`}
                      </p>
                      <p className="text-sm text-ink-muted">{locationSummary(run)}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end">
                      <PriceTag run={run} className="sm:text-right [&_.font-heading]:text-2xl" />
                      <Button asChild size="sm" variant={run.isBookable ? "primary" : "outline"}>
                        <Link href={`/courses/${course.slug}#register`}>{run.isBookable ? "Register" : "Details"}</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
