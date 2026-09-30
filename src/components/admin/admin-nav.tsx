"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; group: string };

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Admin" className="space-y-6">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/50">{g}</p>
          <ul className="mt-2 space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {i.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
