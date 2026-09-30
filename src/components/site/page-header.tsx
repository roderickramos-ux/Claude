import { Container, Eyebrow } from "@/components/ui/misc";

export function PageHeader({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-14 sm:py-20">
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl text-4xl leading-tight text-ink sm:text-5xl">{title}</h1>
        {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">{lead}</p>}
        {children}
      </Container>
    </section>
  );
}
