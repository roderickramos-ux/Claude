/**
 * Seeds starter content. Safe to re-run: existing rows (matched by slug/code) are left untouched,
 * so admin edits are never overwritten. Usage: npm run db:seed
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { siteSettingsSchema } from "../src/lib/settings-schema";
import * as content from "./seed-content";

export async function seed(url: string) {
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(client, { schema });

  try {
    const adminEmails = (process.env.ADMIN_NOTIFICATION_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const settings = siteSettingsSchema.parse({
      contactEmail: adminEmails[0] ?? "",
      address: "Bonifacio Global City, Taguig, Metro Manila",
      adminNotificationEmails: adminEmails,
    });
    await db.insert(schema.siteSettings).values({ id: 1, data: settings }).onConflictDoNothing();

    const [pm] = await db
      .insert(schema.categories)
      .values([
        { name: "Project Management", slug: "project-management", sortOrder: 1 },
        { name: "Data & Analytics", slug: "data-analytics", sortOrder: 2 },
        { name: "Leadership", slug: "leadership", sortOrder: 3 },
      ])
      .onConflictDoNothing()
      .returning();
    const pmCategory =
      pm ?? (await db.query.categories.findFirst({ where: (c, { eq }) => eq(c.slug, "project-management") }));

    await db
      .insert(schema.faculty)
      .values([
        {
          slug: "faculty-one",
          honorific: "Dr.",
          fullName: "Faculty One",
          postNominals: "DBA, PMP",
          positionTitle: "Lead Faculty, Project Management",
          credentials: ["Doctor of Business Administration", "Project Management Professional (PMP)"],
          bio: content.facultyBioA,
          specializations: ["Project management", "Operations", "Public infrastructure"],
          sortOrder: 1,
          isPublished: true,
          isPlaceholder: true,
        },
        {
          slug: "faculty-two",
          honorific: "Dr.",
          fullName: "Faculty Two",
          postNominals: "PhD",
          positionTitle: "Faculty, Leadership & Change",
          credentials: ["PhD in Management"],
          bio: content.facultyBioB,
          specializations: ["Organizational change", "Team leadership"],
          sortOrder: 2,
          isPublished: true,
          isPlaceholder: true,
        },
      ])
      .onConflictDoNothing();
    const facultyRows = await db.query.faculty.findMany();

    await db
      .insert(schema.courses)
      .values({
        slug: "practical-project-management",
        title: "Practical Project Management",
        tagline: "Plan, lead and deliver projects with confidence — in four Saturdays.",
        summary:
          "A hybrid, four-Saturday program where you build a complete, work-ready project plan with doctorate-level faculty.",
        description: content.courseDescription,
        outcomes: [
          "Initiate projects with a clear charter, business case and stakeholder map",
          "Build a work breakdown structure, schedule and budget you can defend",
          "Identify and respond to project risks before they become issues",
          "Lead and communicate with project teams and sponsors",
          "Monitor progress, control change and close projects properly",
          "Leave with a complete project plan for a real project at your workplace",
        ],
        whoShouldAttend: [
          "New and aspiring project managers",
          "Team leads and supervisors handling projects on top of operations",
          "Engineers, IT and business professionals moving into project roles",
          "HR/L&D teams building internal project capability",
        ],
        prerequisites:
          "No formal prerequisites. Bring a laptop and, ideally, a real project from your workplace to use in the workshops.",
        outline: content.courseOutline,
        durationDays: 4,
        defaultFormat: "hybrid",
        categoryId: pmCategory?.id,
        status: "published",
        seoTitle: "Practical Project Management Training (Hybrid, BGC + Zoom)",
        seoDescription:
          "Four-Saturday hybrid project management training in BGC and online, led by doctorate-level faculty. Early-bird and group rates available.",
        isPlaceholder: true,
        sortOrder: 1,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.courses)
      .values({
        slug: "data-management",
        title: "Data Management",
        tagline: "Turn organizational data into a trusted, usable asset.",
        summary: "Coming soon: a practical program on data governance, quality and analytics foundations.",
        description: `${content.PLACEHOLDER} Course details to follow.`,
        durationDays: 3,
        defaultFormat: "hybrid",
        status: "draft",
        isPlaceholder: true,
        sortOrder: 2,
      })
      .onConflictDoNothing();

    const course = await db.query.courses.findFirst({
      where: (c, { eq }) => eq(c.slug, "practical-project-management"),
    });
    if (!course) throw new Error("course missing");

    const sessions: schema.RunSession[] = [
      { date: "2026-11-14", start: "09:00", end: "17:00", mode: "in_person", location: "BGC, Taguig" },
      { date: "2026-11-21", start: "09:00", end: "17:00", mode: "online", location: "Zoom" },
      { date: "2026-11-28", start: "09:00", end: "17:00", mode: "online", location: "Zoom" },
      { date: "2026-12-05", start: "09:00", end: "17:00", mode: "in_person", location: "BGC, Taguig" },
    ];
    const [run] = await db
      .insert(schema.courseRuns)
      .values({
        courseId: course.id,
        code: "PPM-2026-11",
        startDate: "2026-11-14",
        endDate: "2026-12-05",
        sessions,
        format: "hybrid",
        venueName: `${content.PLACEHOLDER} Venue name, BGC`,
        venueAddress: `${content.PLACEHOLDER} Street address, Bonifacio Global City, Taguig`,
        onlineDetails: "Zoom link will be emailed to confirmed participants before Day 2.",
        capacity: 30,
        regularPriceCentavos: 18_000_00,
        earlyBirdPercent: 15,
        earlyBirdDeadline: new Date("2026-10-31T23:59:00+08:00"),
        groupMinSeats: 3,
        groupDiscountPercent: 10,
        stackDiscounts: false,
        registrationDeadline: new Date("2026-11-11T23:59:00+08:00"),
        status: "open",
        preparationNotes:
          "Bring a laptop, a valid ID for building entry, and a project from your workplace you would like to plan during the workshops.",
        isPlaceholder: true,
      })
      .onConflictDoNothing()
      .returning();

    if (run) {
      await db
        .insert(schema.courseFaculty)
        .values(facultyRows.map((f, i) => ({ courseId: course.id, facultyId: f.id, sortOrder: i })))
        .onConflictDoNothing();
      await db
        .insert(schema.runFaculty)
        .values(facultyRows.map((f, i) => ({ runId: run.id, facultyId: f.id, sortOrder: i })))
        .onConflictDoNothing();
    }

    await db
      .insert(schema.pages)
      .values([
        { slug: "about", title: "About Praxis Center", body: content.aboutPage, status: "published", isPlaceholder: true },
        { slug: "privacy", title: "Privacy Policy", body: content.privacyPage, status: "published", isPlaceholder: true },
        { slug: "terms", title: "Terms of Registration", body: content.termsPage, status: "published", isPlaceholder: true },
        {
          slug: "refund-policy",
          title: "Refund & Transfer Policy",
          body: content.refundPage,
          status: "published",
          isPlaceholder: true,
        },
      ])
      .onConflictDoNothing();

    const existingFaqs = await db.query.faqs.findFirst();
    if (!existingFaqs) await db.insert(schema.faqs).values(content.faqs);

    await db
      .insert(schema.paymentChannels)
      .values([
        {
          code: "gcash",
          label: "GCash",
          kind: "ewallet",
          accountName: `${content.PLACEHOLDER} Account name`,
          accountNumber: "09XX XXX XXXX",
          instructions:
            "Open GCash → **Pay QR** and scan the QR code, or **Send Money** to the number shown. Enter your order number in the message field.",
          sortOrder: 1,
        },
        {
          code: "qrph",
          label: "QR Ph (any bank or e-wallet)",
          kind: "qrph",
          accountName: `${content.PLACEHOLDER} Account name`,
          instructions:
            "Scan the QR Ph code with your banking or e-wallet app (BPI, BDO, Maya, UnionBank, etc.).",
          sortOrder: 2,
        },
        {
          code: "bpi",
          label: "BPI bank transfer / BPI QR",
          kind: "bank",
          accountName: `${content.PLACEHOLDER} Praxis Center for Advanced Management`,
          accountNumber: "XXXX-XXXX-XX",
          instructions:
            "Transfer via BPI online/mobile banking or InstaPay/PESONet, or scan the BPI QR code. Use your order number as the reference.",
          sortOrder: 3,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.referralCodes)
      .values({
        code: "SAMPLE-REFERRER",
        referrerName: `${content.PLACEHOLDER} Sample Referrer`,
        rewardType: "fixed_per_seat",
        rewardValue: 500_00,
        buyerDiscountPercent: 0,
        isActive: false,
        notes: "Sample code (inactive). Create real codes in Admin → Referrals.",
      })
      .onConflictDoNothing();

    console.log("✓ seed complete");
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  seed(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
