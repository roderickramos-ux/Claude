import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/ui/misc";
import { listGeneralFaqs } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about registration, payments, group rates and our training programs.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await listGeneralFaqs();
  const groups = new Map<string, typeof faqs>();
  for (const f of faqs) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <PageHeader eyebrow="Help" title="Frequently asked questions" lead={<>Can&apos;t find your answer? <Link href="/contact" className="text-primary underline">Contact us</Link>.</>} />
      <Container className="max-w-3xl space-y-10 py-12">
        {[...groups].map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-4 text-2xl text-ink">{category}</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-surface">
              {list.map((f) => (
                <details key={f.id} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                    {f.question}
                    <span className="text-xl text-accent-strong transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <Markdown className="mt-3 text-base text-ink-muted">{f.answer}</Markdown>
                </details>
              ))}
            </div>
          </section>
        ))}
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
