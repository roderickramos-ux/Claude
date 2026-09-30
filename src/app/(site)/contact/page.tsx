import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { PageHeader } from "@/components/site/page-header";
import { SocialLinks } from "@/components/site/social-links";
import { Card, Container } from "@/components/ui/misc";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Praxis Center for Advanced Management.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Contact" title="We'd like to hear from you" lead="Questions about a program, registration or payment? Send us a message and we'll reply within one business day." />
      <Container className="grid gap-10 py-12 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-8"><InquiryForm type="contact" /></Card>
        <div className="space-y-6">
          <Card className="space-y-4 p-6 text-ink">
            {s.contactEmail && (
              <p className="flex items-center gap-3"><Mail className="size-5 text-accent-strong" aria-hidden /><a href={`mailto:${s.contactEmail}`} className="hover:text-primary">{s.contactEmail}</a></p>
            )}
            {s.contactPhone && (
              <p className="flex items-center gap-3"><Phone className="size-5 text-accent-strong" aria-hidden /><a href={`tel:${s.contactPhone.replace(/\s/g, "")}`} className="hover:text-primary">{s.contactPhone}</a></p>
            )}
            {s.address && <p className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 text-accent-strong" aria-hidden />{s.address}</p>}
            {s.socials.viber && <p className="text-sm text-ink-muted">Viber: {s.socials.viber}</p>}
          </Card>
          <SocialLinks socials={s.socials} />
        </div>
      </Container>
    </>
  );
}
