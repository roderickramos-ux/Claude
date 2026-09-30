import type { Metadata } from "next";
import { Cover } from "@/components/catalog/cover";
import { Markdown } from "@/components/markdown";
import { LinkedinIcon } from "@/components/site/social-icons";
import { PageHeader } from "@/components/site/page-header";
import { Badge, Card, Container } from "@/components/ui/misc";
import { facultyDisplayName, listPublishedFaculty } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Faculty",
  description: "Meet Praxis Center's scholar-practitioner faculty: doctorate holders with deep industry and public-sector experience.",
  alternates: { canonical: "/faculty" },
};

export default async function FacultyPage() {
  const faculty = await listPublishedFaculty();
  return (
    <>
      <PageHeader
        eyebrow="Faculty"
        title="Scholar-practitioners"
        lead="Our faculty hold doctorate degrees and have led the kind of projects, teams and organizations our participants work in every day."
      />
      <Container className="space-y-8 py-12">
        {faculty.map((f) => {
          const initials = f.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("");
          return (
            <Card key={f.id} id={f.slug} className="grid scroll-mt-24 gap-8 p-6 sm:p-8 md:grid-cols-[12rem_1fr]">
              {f.photoPath ? (
                <Cover path={f.photoPath} alt={facultyDisplayName(f)} className="aspect-square w-40 rounded-xl md:w-full" sizes="192px" />
              ) : (
                <div aria-hidden className="grid aspect-square w-40 place-items-center rounded-xl bg-primary-soft font-heading text-5xl text-primary md:w-full">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="text-3xl text-ink">{facultyDisplayName(f)}</h2>
                {f.positionTitle && <p className="mt-1 text-accent-strong">{f.positionTitle}</p>}
                {f.specializations.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {f.specializations.map((s) => <Badge key={s}>{s}</Badge>)}
                  </div>
                )}
                <Markdown className="mt-5">{f.bio}</Markdown>
                {f.credentials.length > 0 && (
                  <ul className="mt-5 space-y-1 text-sm text-ink-muted">
                    {f.credentials.map((c) => <li key={c}>• {c}</li>)}
                  </ul>
                )}
                {f.linkedinUrl && (
                  <a href={f.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <LinkedinIcon width={16} height={16} /> LinkedIn profile
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </Container>
    </>
  );
}
