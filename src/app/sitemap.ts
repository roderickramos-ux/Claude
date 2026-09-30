import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SITE_MODE === "coming_soon") {
    return [{ url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 }, { url: absoluteUrl("/privacy"), priority: 0.2 }];
  }
  const [courses, pages] = await Promise.all([
    db.query.courses.findMany({ where: eq(schema.courses.status, "published"), columns: { slug: true, updatedAt: true } }),
    db.query.pages.findMany({ where: eq(schema.pages.status, "published"), columns: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["/", "/courses", "/calendar", "/faculty", "/corporate", "/faq", "/contact"];
  return [
    ...staticPaths.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...courses.map((c) => ({ url: absoluteUrl(`/courses/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...pages.map((p) => ({ url: absoluteUrl(`/${p.slug}`), lastModified: p.updatedAt, priority: 0.4 })),
  ];
}
