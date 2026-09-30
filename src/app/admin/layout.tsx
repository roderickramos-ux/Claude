import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav, type NavItem } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { hasRole, requireRole } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Praxis Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("staff");
  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", group: "Overview" },
    { href: "/admin/orders", label: "Orders & payments", group: "Sales" },
    { href: "/admin/registrations", label: "Registrations", group: "Sales" },
    { href: "/admin/referrals", label: "Referrals", group: "Sales" },
    { href: "/admin/leads", label: "Leads & inquiries", group: "Sales" },
    ...(hasRole(user, "admin")
      ? [
          { href: "/admin/courses", label: "Courses", group: "Catalog" },
          { href: "/admin/runs", label: "Batches (runs)", group: "Catalog" },
          { href: "/admin/faculty", label: "Faculty", group: "Catalog" },
          { href: "/admin/pages", label: "Pages & policies", group: "Content" },
          { href: "/admin/faqs", label: "FAQs", group: "Content" },
          { href: "/admin/payment-channels", label: "Payment channels", group: "Settings" },
          { href: "/admin/settings", label: "Site settings", group: "Settings" },
          { href: "/admin/notifications", label: "Email log", group: "Settings" },
        ]
      : []),
    ...(hasRole(user, "super_admin") ? [{ href: "/admin/users", label: "Users & roles", group: "Settings" }] : []),
  ];
  return (
    <div className="min-h-dvh bg-muted/50 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-primary px-3 py-5 text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between px-3 lg:block">
          <Link href="/admin" className="font-heading text-xl tracking-[0.2em] text-white">PRAXIS</Link>
          <p className="text-xs text-white/60 lg:mt-1">Admin</p>
        </div>
        <details className="mt-4 lg:hidden">
          <summary className="cursor-pointer px-3 text-sm text-white/80">Menu</summary>
          <div className="mt-3"><AdminNav items={items} /></div>
        </details>
        <div className="mt-8 hidden lg:block"><AdminNav items={items} /></div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 border-b border-border bg-surface px-4 py-3 sm:px-8">
          <Link href="/" target="_blank" className="text-sm text-ink-muted hover:text-primary">View site ↗</Link>
          <span className="hidden text-sm text-ink-muted sm:inline">{user.email} · {user.role.replace("_", " ")}</span>
          <form action={logout}><Button size="sm" variant="outline" type="submit">Sign out</Button></form>
        </header>
        <div className="px-4 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
