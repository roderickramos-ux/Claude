"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db/client";
import type { RunSession } from "@/db/schema";
import { fromManilaDateTimeLocal } from "@/lib/dates";
import { pesosToCentavos } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { bool, guarded, lines, maybeUpload, optStr, str, type ActionState } from "./helpers";

const uuid = z.string().uuid();
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only").max(80);

function revalidateCatalog(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/courses/${slug}`);
}

// ── Courses ──────────────────────────────────────────────────

export async function saveCourse(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const title = z.string().trim().min(3, "Title is required").max(160).parse(str(fd, "title"));
    const slug = slugSchema.parse(str(fd, "slug") || slugify(title));
    const values = {
      title,
      slug,
      tagline: optStr(fd, "tagline"),
      summary: optStr(fd, "summary"),
      description: optStr(fd, "description"),
      outcomes: lines(fd, "outcomes"),
      whoShouldAttend: lines(fd, "whoShouldAttend"),
      prerequisites: optStr(fd, "prerequisites"),
      outline: optStr(fd, "outline"),
      durationDays: z.coerce.number().int().min(1).max(30).parse(fd.get("durationDays")),
      defaultFormat: z.enum(schema.deliveryFormat.enumValues).parse(fd.get("defaultFormat")),
      categoryId: optStr(fd, "categoryId"),
      status: z.enum(schema.courseStatus.enumValues).parse(fd.get("status")),
      seoTitle: optStr(fd, "seoTitle"),
      seoDescription: optStr(fd, "seoDescription"),
      isPlaceholder: bool(fd, "isPlaceholder"),
      sortOrder: z.coerce.number().int().default(0).parse(fd.get("sortOrder") || 0),
    };
    const cover = await maybeUpload(fd, "coverImage", "public", "courses", { images: true });
    const brochure = await maybeUpload(fd, "brochure", "public", "brochures", { pdf: true });
    const files = {
      ...(cover && { coverImagePath: cover }),
      ...(brochure && { brochurePath: brochure }),
      ...(bool(fd, "removeCover") && { coverImagePath: null }),
      ...(bool(fd, "removeBrochure") && { brochurePath: null }),
    };
    const facultyIds = fd.getAll("facultyIds").map(String).filter((v) => uuid.safeParse(v).success);

    const courseId = await db.transaction(async (tx) => {
      let cid = id;
      if (cid) {
        await tx.update(schema.courses).set({ ...values, ...files }).where(eq(schema.courses.id, cid));
      } else {
        const [row] = await tx.insert(schema.courses).values({ ...values, ...files }).returning({ id: schema.courses.id });
        cid = row.id;
      }
      await tx.delete(schema.courseFaculty).where(eq(schema.courseFaculty.courseId, cid));
      if (facultyIds.length) {
        await tx.insert(schema.courseFaculty).values(facultyIds.map((f, i) => ({ courseId: cid!, facultyId: f, sortOrder: i })));
      }
      return cid;
    });
    revalidateCatalog(slug);
    if (!id) redirect(`/admin/courses/${courseId}?created=1`);
    return { ok: true, message: "Course saved." };
  });
}

export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const name = z.string().trim().min(2).max(80).parse(str(fd, "name"));
    await db.insert(schema.categories).values({ name, slug: slugify(name) }).onConflictDoNothing();
    revalidatePath("/admin/courses");
    return { ok: true, message: `Category "${name}" added.` };
  });
}

// ── Runs (batches) ───────────────────────────────────────────

const sessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Each session needs a date"),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  mode: z.enum(["in_person", "online"]),
  location: z.string().trim().max(120).optional(),
});

export async function saveRun(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const parsedSessions = z.array(sessionSchema).min(1, "Add at least one session").safeParse(JSON.parse(str(fd, "sessions") || "[]"));
    if (!parsedSessions.success) {
      return { message: "Please fix the sessions.", errors: { sessions: parsedSessions.error.issues[0].message } };
    }
    const sessions = parsedSessions.data.sort((a, b) => a.date.localeCompare(b.date)) as RunSession[];
    const bad = sessions.find((x) => x.end <= x.start);
    if (bad) return { message: "Please fix the sessions.", errors: { sessions: `Session on ${bad.date} ends before it starts` } };

    const values = {
      courseId: uuid.parse(fd.get("courseId")),
      code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only").parse(str(fd, "code")).toUpperCase(),
      sessions,
      startDate: sessions[0].date,
      endDate: sessions[sessions.length - 1].date,
      format: z.enum(schema.deliveryFormat.enumValues).parse(fd.get("format")),
      venueName: optStr(fd, "venueName"),
      venueAddress: optStr(fd, "venueAddress"),
      venueMapUrl: optStr(fd, "venueMapUrl"),
      onlineDetails: optStr(fd, "onlineDetails"),
      capacity: z.coerce.number().int().min(1).max(1000).parse(fd.get("capacity")),
      regularPriceCentavos: pesosToCentavos(str(fd, "regularPrice")),
      earlyBirdPercent: z.coerce.number().int().min(0).max(90).parse(fd.get("earlyBirdPercent") || 0),
      earlyBirdDeadline: fromManilaDateTimeLocal(str(fd, "earlyBirdDeadline")),
      groupMinSeats: z.coerce.number().int().min(2).max(100).parse(fd.get("groupMinSeats") || 3),
      groupDiscountPercent: z.coerce.number().int().min(0).max(90).parse(fd.get("groupDiscountPercent") || 0),
      stackDiscounts: bool(fd, "stackDiscounts"),
      registrationDeadline: fromManilaDateTimeLocal(str(fd, "registrationDeadline")),
      status: z.enum(schema.runStatus.enumValues).parse(fd.get("status")),
      preparationNotes: optStr(fd, "preparationNotes"),
      isPlaceholder: bool(fd, "isPlaceholder"),
    };
    const facultyIds = fd.getAll("facultyIds").map(String).filter((v) => uuid.safeParse(v).success);

    const runId = await db.transaction(async (tx) => {
      let rid = id;
      if (rid) await tx.update(schema.courseRuns).set(values).where(eq(schema.courseRuns.id, rid));
      else rid = (await tx.insert(schema.courseRuns).values(values).returning({ id: schema.courseRuns.id }))[0].id;
      await tx.delete(schema.runFaculty).where(eq(schema.runFaculty.runId, rid));
      if (facultyIds.length) await tx.insert(schema.runFaculty).values(facultyIds.map((f, i) => ({ runId: rid!, facultyId: f, sortOrder: i })));
      return rid;
    });
    revalidateCatalog();
    if (!id) redirect(`/admin/runs/${runId}?created=1`);
    return { ok: true, message: "Batch saved." };
  });
}

export async function duplicateRun(fd: FormData) {
  await guarded("admin", async () => {
    const run = await db.query.courseRuns.findFirst({ where: eq(schema.courseRuns.id, uuid.parse(fd.get("id"))), with: { faculty: true } });
    if (!run) throw new Error("Run not found");
    const { id: _id, createdAt: _c, updatedAt: _u, faculty, ...rest } = run;
    void _id; void _c; void _u;
    const [copy] = await db
      .insert(schema.courseRuns)
      .values({ ...rest, code: `${run.code}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}`, status: "draft" })
      .returning();
    if (faculty.length) await db.insert(schema.runFaculty).values(faculty.map((f) => ({ ...f, runId: copy.id })));
    redirect(`/admin/runs/${copy.id}?created=1`);
  });
}

// ── Faculty ──────────────────────────────────────────────────

export async function saveFaculty(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("admin", async () => {
    const id = optStr(fd, "id");
    const fullName = z.string().trim().min(2, "Name is required").max(120).parse(str(fd, "fullName"));
    const values = {
      fullName,
      slug: slugSchema.parse(str(fd, "slug") || slugify(fullName)),
      honorific: optStr(fd, "honorific"),
      postNominals: optStr(fd, "postNominals"),
      positionTitle: optStr(fd, "positionTitle"),
      credentials: lines(fd, "credentials"),
      bio: optStr(fd, "bio"),
      specializations: str(fd, "specializations").split(",").map((s) => s.trim()).filter(Boolean),
      linkedinUrl: z.union([z.literal(""), z.string().url("Enter a full URL")]).parse(str(fd, "linkedinUrl")) || null,
      sortOrder: z.coerce.number().int().parse(fd.get("sortOrder") || 0),
      isPublished: bool(fd, "isPublished"),
      isPlaceholder: bool(fd, "isPlaceholder"),
    };
    const photo = await maybeUpload(fd, "photo", "public", "faculty", { images: true });
    const set = { ...values, ...(photo && { photoPath: photo }), ...(bool(fd, "removePhoto") && { photoPath: null }) };
    let fid = id;
    if (fid) await db.update(schema.faculty).set(set).where(eq(schema.faculty.id, fid));
    else fid = (await db.insert(schema.faculty).values(set).returning({ id: schema.faculty.id }))[0].id;
    revalidateCatalog();
    if (!id) redirect(`/admin/faculty/${fid}?created=1`);
    return { ok: true, message: "Faculty profile saved." };
  });
}
