"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav } from "./nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the menu when navigating to a new page (adjusting state during render).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-md text-ink hover:bg-muted"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {open && (
        <nav
          id="mobile-menu"
          className="fixed inset-x-0 top-[var(--header-h,4.5rem)] bottom-0 z-40 overflow-y-auto border-t border-border bg-surface px-4 py-6"
        >
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-3 text-lg text-ink hover:bg-muted aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3">
            <Link
              href="/courses"
              className="flex h-12 items-center justify-center rounded-md bg-primary font-medium text-primary-ink"
            >
              Register Now
            </Link>
            <Link
              href="/corporate"
              className="flex h-12 items-center justify-center rounded-md border border-primary/30 font-medium text-primary"
            >
              Inquire for Your Team
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
