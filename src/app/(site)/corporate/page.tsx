import { Building2, ClipboardList, Receipt, Users } from "lucide-react";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { PageHeader } from "@/components/site/page-header";
import { Card, Container } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Training for Organizations",
  description: "Group registrations, company billing and in-house training programs for HR and L&D teams.",
  alternates: { canonical: "/corporate" },
};

const offers = [
  { icon: Users, title: "Group rates", body: "Register 3 or more participants in the same batch and get our group rate automatically at checkout." },
  { icon: Receipt, title: "Company billing", body: "Choose “Bill my company” at checkout to receive a proforma invoice for your finance team." },
  { icon: Building2, title: "In-house programs", body: "We run any program exclusively for your organization, in your office, at a venue, or online." },
  { icon: ClipboardList, title: "Tailored content", body: "We adapt cases and workshops to your projects, processes and industry." },
];

export default function CorporatePage() {
  return (
    <>
      <PageHeader eyebrow="For HR & L&D teams" title="Build capability across your team" lead="From sending a few employees to a public batch to a fully customized in-house program, we make it simple to develop your people." />
      <Container className="py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <Icon className="size-7 text-accent-strong" aria-hidden />
              <h2 className="mt-4 text-xl text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="text-3xl text-ink">Request a proposal</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">
              Tell us about your team and goals. We&apos;ll reply within one business day with options, schedules and pricing.
            </p>
          </div>
          <Card className="p-6 sm:p-8"><InquiryForm type="corporate" /></Card>
        </div>
      </Container>
    </>
  );
}
