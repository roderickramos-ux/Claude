import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui/misc";
import type { CatalogCourse } from "@/server/queries/catalog";
import { Cover } from "./cover";
import { formatLabel } from "./labels";
import { PriceTag } from "./price";
import { locationSummary, scheduleSummary } from "./schedule";

export function CourseCard({ course }: { course: CatalogCourse }) {
  const next = course.runs.find((r) => r.isBookable) ?? course.runs[0];
  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/courses/${course.slug}`} className="block" tabIndex={-1} aria-hidden>
        <Cover path={course.coverImagePath} alt="" label={course.category?.name ?? undefined} className="aspect-[16/9]" />
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="primary">{formatLabel[next?.format ?? course.defaultFormat]}</Badge>
          <Badge>{course.durationDays} {course.durationDays === 1 ? "day" : "days"}</Badge>
          {next && !next.isBookable && <Badge tone="danger">{next.seatsLeft <= 0 ? "Fully booked" : "Closed"}</Badge>}
        </div>
        <h3 className="text-2xl leading-snug text-ink">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            <span className="relative">{course.title}</span>
          </Link>
        </h3>
        {course.tagline && <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{course.tagline}</p>}
        {next ? (
          <div className="mt-5 space-y-2 text-sm text-ink-muted">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-accent-strong" aria-hidden />
              {scheduleSummary(next.sessions, next.startDate, next.endDate)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-accent-strong" aria-hidden />
              {locationSummary(next)}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-ink-muted">New dates coming soon.</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          {next ? <PriceTag run={next} className="[&_.font-heading]:text-2xl" /> : <span />}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Card>
  );
}
