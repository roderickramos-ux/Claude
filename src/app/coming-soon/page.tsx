import { CalendarDays, GraduationCap, Mail, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Analytics, CookieConsent } from "@/components/site/consent";
import { Logo } from "@/components/site/logo";
import { SocialLinks } from "@/components/site/social-links";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { Container, Eyebrow } from "@/components/ui/misc";
import { formatDayMonth } from "@/lib/dates";
import { listUpcomingRuns } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: { absolute: "Praxis Center for Advanced Management | Launching November 2026" },
  description:
    "Doctorate-led, practice-focused professional training in the Philippines. Our first program, Practical Project Management, starts November 2026 in BGC and online. Sign up to be notified.",
  alternates: { canonical: "/" },
};

export default async function ComingSoonPage() {
  const [settings, upcoming] = await Promise.all([getSettings(), listUpcomingRuns().catch(() => [])]);
  const first = upcoming[0];
  const sessions = first?.run.sessions ?? [];
  const locations = [...new Set(sessions.map((s) => s.location).filter(Boolean))].join(" + ");

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] text-white">
      <div aria-hidden className="pointer-events-none fixed -right-40 -top-40 size-[34rem] rounded-full border border-white/10" />
      <div aria-hidden className="pointer-events-none fixed -right-20 -top-20 size-[24rem] rounded-full border border-accent/25" />
      <header>
        <Container className="flex h-20 items-center">
          <Logo logoPath={settings.logoLightPath || settings.logoPath} variant="light" />
        </Container>
      </header>

      <main id="main" className="flex-1">
        <Container className="grid gap-12 py-10 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:py-20">
          <div>
            <Eyebrow className="text-accent">Launching November 2026</Eyebrow>
            <h1 className="mt-4 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              Doctorate-led training, built for practice.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Praxis Center for Advanced Management brings scholar-practitioners, faculty with doctorates and real-world
              leadership experience, to short, intensive programs for Philippine professionals and teams.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: GraduationCap, t: "Doctorate-level faculty" },
                { icon: Users, t: "Small, focused cohorts" },
                { icon: CalendarDays, t: "2–5 day intensives" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-accent">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/15">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">First program</p>
              <h2 className="mt-2 text-3xl">{first?.course.title ?? "Practical Project Management"}</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 text-accent" aria-hidden />
                  {sessions.length > 0
                    ? `${sessions.length} Saturdays: ${sessions.map((s) => formatDayMonth(s.date)).join(", ")}`
                    : "4 Saturdays starting 14 November 2026"}
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-accent" aria-hidden />
                  Hybrid: {locations || "BGC, Taguig + Zoom"}
                </li>
              </ul>
              <p className="mt-4 text-sm text-white/70">Early-bird and group rates for teams of 3 or more.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-6 text-ink shadow-2xl sm:p-8">
            <h2 className="text-3xl text-ink">Be the first to know</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Get notified when registration opens, plus early-bird pricing for our first batch.
            </p>
            <div className="mt-6">
              <NewsletterForm
                source="coming_soon"
                withName
                interests={["Project Management", "Data Management", "Training for my team"]}
                submitLabel="Notify me"
              />
            </div>
            {settings.contactEmail && (
              <p className="mt-8 flex items-center gap-2 border-t border-border pt-6 text-sm text-ink-muted">
                <Mail className="size-4 text-accent-strong" aria-hidden />
                Training for your organization?{" "}
                <a href={`mailto:${settings.contactEmail}?subject=Team%20training%20inquiry`} className="text-primary underline">
                  Email us
                </a>
              </p>
            )}
          </div>
        </Container>
      </main>

      <footer className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.businessName}. SEC-registered in the Philippines.</p>
          <div className="flex items-center gap-4">
            <SocialLinks socials={settings.socials} tone="light" />
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          </div>
        </Container>
      </footer>
      <CookieConsent />
      <Analytics />
      <OrganizationJsonLd settings={settings} />
    </div>
  );
}
