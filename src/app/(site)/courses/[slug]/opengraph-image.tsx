import { scheduleSummary } from "@/components/catalog/schedule";
import { brandedOgImage, ogSize } from "@/lib/og";
import { getCourseBySlug } from "@/server/queries/catalog";

export const alt = "Praxis Center course";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  const run = course?.runs.find((r) => r.isBookable) ?? course?.runs[0];
  return brandedOgImage({
    eyebrow: run ? scheduleSummary(run.sessions, run.startDate, run.endDate) : "Professional training",
    title: course?.title ?? "Praxis Center",
    subtitle: course?.tagline ?? undefined,
    footer: "praxiscenter.ph · Early-bird & group rates available",
  });
}
