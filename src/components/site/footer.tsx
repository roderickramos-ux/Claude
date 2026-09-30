import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/misc";
import type { SiteSettings } from "@/lib/settings-schema";
import { Logo } from "./logo";
import { SocialLinks } from "./social-links";

const columns = [
  {
    title: "Programs",
    links: [
      { href: "/courses", label: "All courses" },
      { href: "/calendar", label: "Training calendar" },
      { href: "/corporate", label: "In-house training" },
    ],
  },
  {
    title: "Praxis",
    links: [
      { href: "/about", label: "About us" },
      { href: "/faculty", label: "Faculty" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Registration" },
      { href: "/refund-policy", label: "Refund & Transfer Policy" },
    ],
  },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-primary text-primary-ink">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo logoPath={settings.logoLightPath || settings.logoPath} variant="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">{settings.tagline}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            {settings.contactEmail && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-accent" aria-hidden />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-white">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.contactPhone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-accent" aria-hidden />
                <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-white">
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-accent" aria-hidden />
                <span>{settings.address}</span>
              </li>
            )}
          </ul>
          <SocialLinks socials={settings.socials} className="mt-6" tone="light" />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-accent">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/80 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.businessName}. SEC-registered in the Philippines.
          </p>
          {settings.dpo.email && (
            <p>
              Data Protection Officer:{" "}
              <a href={`mailto:${settings.dpo.email}`} className="underline-offset-2 hover:underline">
                {settings.dpo.name || settings.dpo.email}
              </a>
            </p>
          )}
        </Container>
      </div>
    </footer>
  );
}
