import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import type { SiteSettings } from "@/lib/settings-schema";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { mainNav } from "./nav";

export function Header({ settings, cartCount }: { settings: SiteSettings; cartCount: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 [--header-h:4.5rem]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-ink"
      >
        Skip to content
      </a>
      <Container className="flex h-[4.5rem] items-center justify-between gap-4">
        <Logo logoPath={settings.logoPath} />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-2.5 py-2 text-[0.92rem] text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/cart"
            className="relative grid size-10 place-items-center rounded-md text-ink hover:bg-muted"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "seat" : "seats"}`}
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.7rem] font-semibold text-accent-ink">
                {cartCount}
              </span>
            )}
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/courses">Register Now</Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}

export function AnnouncementBar({ settings }: { settings: SiteSettings }) {
  const a = settings.announcement;
  if (!a.enabled || !a.text) return null;
  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-primary-ink">
      {a.href ? (
        <Link href={a.href} className="underline-offset-4 hover:underline">
          {a.text} <span aria-hidden>→</span>
        </Link>
      ) : (
        a.text
      )}
    </div>
  );
}
