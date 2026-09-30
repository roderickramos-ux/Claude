import "server-only";
import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db/client";
import { manilaYmd } from "@/lib/dates";

const { courses, courseRuns, faculty, courseFaculty, runFaculty, registrations, categories } = schema;

/** Registration statuses that occupy a seat. */
export const SEAT_HOLDING_STATUSES = ["pending_payment", "confirmed", "attended", "completed"] as const;

export type CourseRow = typeof courses.$inferSelect;
export type RunRow = typeof courseRuns.$inferSelect;
export type FacultyRow = typeof faculty.$inferSelect;

export type RunWithAvailability = RunRow & { seatsTaken: number; seatsLeft: number; isBookable: boolean };

export async function seatsTakenByRun(runIds: string[]): Promise<Map<string, number>> {
  if (runIds.length === 0) return new Map();
  const rows = await db
    .select({ runId: registrations.runId, n: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(inArray(registrations.runId, runIds), inArray(registrations.status, [...SEAT_HOLDING_STATUSES])))
    .groupBy(registrations.runId);
  return new Map(rows.map((r) => [r.runId, r.n]));
}

export function isRunBookable(run: RunRow, seatsLeft: number, now = new Date()): boolean {
  if (run.status !== "open") return false;
  if (seatsLeft <= 0) return false;
  if (run.registrationDeadline && now > run.registrationDeadline) return false;
  return run.startDate >= manilaYmd(now);
}

export async function withAvailability(runs: RunRow[]): Promise<RunWithAvailability[]> {
  const taken = await seatsTakenByRun(runs.map((r) => r.id));
  return runs.map((r) => {
    const seatsTaken = taken.get(r.id) ?? 0;
    const seatsLeft = Math.max(0, r.capacity - seatsTaken);
    return { ...r, seatsTaken, seatsLeft, isBookable: isRunBookable(r, seatsLeft) };
  });
}

/** Upcoming public runs (open or full) of published courses, soonest first. */
export const listUpcomingRuns = cache(async () => {
  const rows = await db
    .select({ run: courseRuns, course: courses })
    .from(courseRuns)
    .innerJoin(courses, eq(courseRuns.courseId, courses.id))
    .where(
      and(
        inArray(courseRuns.status, ["open", "full", "closed"]),
        eq(courses.status, "published"),
        gte(courseRuns.endDate, manilaYmd()),
      ),
    )
    .orderBy(asc(courseRuns.startDate));
  const runs = await withAvailability(rows.map((r) => r.run));
  return runs.map((run, i) => ({ run, course: rows[i].course }));
});

export type UpcomingRun = Awaited<ReturnType<typeof listUpcomingRuns>>[number];

export const listCategories = cache(async () =>
  db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
);

export const listPublishedCourses = cache(async () => {
  const list = await db.query.courses.findMany({
    where: eq(courses.status, "published"),
    orderBy: [asc(courses.sortOrder), asc(courses.title)],
    with: { category: true },
  });
  const upcoming = await listUpcomingRuns();
  return list.map((c) => ({
    ...c,
    runs: upcoming.filter((u) => u.course.id === c.id).map((u) => u.run),
  }));
});

export type CatalogCourse = Awaited<ReturnType<typeof listPublishedCourses>>[number];

export const getCourseBySlug = cache(async (slug: string, includeDrafts = false) => {
  const course = await db.query.courses.findFirst({
    where: includeDrafts
      ? and(eq(courses.slug, slug), sql`${courses.status} <> 'archived'`)
      : and(eq(courses.slug, slug), eq(courses.status, "published")),
    with: {
      category: true,
      faculty: { with: { faculty: true }, orderBy: [asc(courseFaculty.sortOrder)] },
    },
  });
  if (!course) return null;

  const runRows = await db.query.courseRuns.findMany({
    where: and(
      eq(courseRuns.courseId, course.id),
      includeDrafts
        ? inArray(courseRuns.status, ["draft", "open", "full", "closed"])
        : inArray(courseRuns.status, ["open", "full", "closed"]),
      gte(courseRuns.endDate, manilaYmd()),
    ),
    orderBy: [asc(courseRuns.startDate)],
    with: { faculty: { with: { faculty: true }, orderBy: [asc(runFaculty.sortOrder)] } },
  });
  const runs = await withAvailability(runRows);
  const runFacultyMap = new Map(runRows.map((r) => [r.id, r.faculty.map((f) => f.faculty)]));

  const faqs = await db.query.faqs.findMany({
    where: and(
      eq(schema.faqs.isPublished, true),
      or(eq(schema.faqs.courseId, course.id), and(isNull(schema.faqs.courseId), eq(schema.faqs.category, "Registration"))),
    ),
    orderBy: [asc(schema.faqs.sortOrder)],
  });

  const courseFacultyList = course.faculty.map((f) => f.faculty).filter((f) => f.isPublished || includeDrafts);
  return {
    ...course,
    facultyList: courseFacultyList,
    runs: runs.map((r) => ({ ...r, facultyList: runFacultyMap.get(r.id) ?? [] })),
    faqs,
  };
});

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;

export const listPublishedFaculty = cache(async () =>
  db.query.faculty.findMany({
    where: eq(faculty.isPublished, true),
    orderBy: [asc(faculty.sortOrder), asc(faculty.fullName)],
  }),
);

export const getPublishedPage = cache(async (slug: string) =>
  db.query.pages.findFirst({
    where: and(eq(schema.pages.slug, slug), eq(schema.pages.status, "published")),
  }),
);

export const listGeneralFaqs = cache(async () =>
  db.query.faqs.findMany({
    where: and(eq(schema.faqs.isPublished, true), isNull(schema.faqs.courseId)),
    orderBy: [asc(schema.faqs.category), asc(schema.faqs.sortOrder)],
  }),
);

export const listActivePaymentChannels = cache(async () =>
  db.query.paymentChannels.findMany({
    where: eq(schema.paymentChannels.isActive, true),
    orderBy: [asc(schema.paymentChannels.sortOrder)],
  }),
);

export function facultyDisplayName(f: Pick<FacultyRow, "honorific" | "fullName" | "postNominals">) {
  return [f.honorific, f.fullName].filter(Boolean).join(" ") + (f.postNominals ? `, ${f.postNominals}` : "");
}
