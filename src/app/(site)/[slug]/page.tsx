import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/ui/misc";
import { formatDateLong } from "@/lib/dates";
import { getPublishedPage } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

/** CMS pages managed in Admin → Pages (About, Privacy Policy, Terms, Refund Policy, …). */
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return {};
  return { title: page.title, description: page.seoDescription ?? undefined, alternates: { canonical: `/${page.slug}` } };
}

export default async function CmsPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const [page, settings] = await Promise.all([getPublishedPage(slug), getSettings()]);
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} />
      <Container className="py-12">
        <div className="max-w-3xl">
          <Markdown>{page.body}</Markdown>
          {slug === "privacy" && (settings.dpo.name || settings.dpo.email) && (
            <div className="mt-10 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-2xl text-ink">Contact our Data Protection Officer</h2>
              <p className="mt-2 text-ink-muted">
                {settings.dpo.name}
                {settings.dpo.email && (
                  <> · <a href={`mailto:${settings.dpo.email}`} className="text-primary underline">{settings.dpo.email}</a></>
                )}
              </p>
            </div>
          )}
          <p className="mt-10 text-sm text-ink-muted">Last updated {formatDateLong(page.updatedAt)}</p>
        </div>
      </Container>
    </>
  );
}
