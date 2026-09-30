import { CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Alert, Badge, Card, Eyebrow } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Style guide: visual directions", robots: { index: false } };

const directions = [
  {
    id: "a",
    name: "A · Scholar",
    note: "Deep navy + antique gold. Cormorant Garamond headings with Inter body. Classic, institutional, most “academic”.",
  },
  {
    id: "b",
    name: "B · Practitioner",
    note: "Forest green + amber. Fraunces headings with Source Sans 3 body. Warmer and more contemporary, slightly less formal.",
  },
];

const swatches = ["primary", "accent", "accent-strong", "ink", "ink-muted", "muted", "bg", "border"];

function Direction({ id, name, note }: (typeof directions)[number]) {
  return (
    <section data-theme={id} className="min-w-0 bg-bg text-ink" style={{ fontFamily: "var(--font-body)" }}>
      <div className="border-b border-border bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Direction</p>
        <h2 className="mt-1 text-3xl">{name}</h2>
        <p className="mt-2 text-sm text-ink-muted">{note}</p>
        <p className="mt-2 text-xs text-ink-muted">Activate with <code className="rounded bg-muted px-1">NEXT_PUBLIC_THEME={id}</code></p>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] p-8 text-white">
        <Eyebrow className="text-accent">Doctorate-led professional training</Eyebrow>
        <h3 className="mt-3 text-4xl leading-tight">Management education you can put to work on Monday.</h3>
        <p className="mt-4 text-white/80">Short, intensive programs taught by scholar-practitioners.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="accent">Register Now</Button>
          <Button variant="outline-light">Inquire for Your Team</Button>
        </div>
      </div>

      <div className="space-y-8 p-6">
        {/* Palette */}
        <div>
          <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Palette</h4>
          <div className="grid grid-cols-4 gap-2">
            {swatches.map((s) => (
              <div key={s} className="text-xs">
                <div className="h-12 rounded-md border border-border" style={{ background: `var(--${s})` }} />
                <p className="mt-1 text-ink-muted">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Typography</h4>
          <p className="font-heading text-5xl leading-none">Praxis</p>
          <p className="mt-2 font-heading text-3xl">Where scholarship meets practice</p>
          <p className="mt-2 text-2xl font-heading">Practical Project Management</p>
          <p className="mt-3 leading-relaxed text-ink-muted">
            Body text: every program pairs research-grounded frameworks with hands-on workshops, so participants leave with outputs they can use at work the following week.
          </p>
        </div>

        {/* Components */}
        <div className="space-y-4">
          <h4 className="font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">Components</h4>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">Hybrid</Badge>
            <Badge tone="accent">Early-bird</Badge>
            <Badge tone="success">Confirmed</Badge>
            <Badge tone="warning">Awaiting payment</Badge>
            <Badge tone="danger">Only 3 seats left</Badge>
          </div>
          <div className="max-w-sm">
            <Label htmlFor={`sg-${id}`}>Work email</Label>
            <Input id={`sg-${id}`} placeholder="you@company.com" />
          </div>
          <Alert tone="success">Payment verified. Your seats are confirmed.</Alert>
        </div>

        {/* Course card */}
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/7] bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)]">
            <span className="absolute bottom-3 left-4 font-heading text-lg text-white/90">Project Management</span>
          </div>
          <div className="p-5">
            <div className="flex gap-2"><Badge tone="primary">Hybrid</Badge><Badge>4 days</Badge></div>
            <h3 className="mt-3 text-2xl">Practical Project Management</h3>
            <div className="mt-3 space-y-1 text-sm text-ink-muted">
              <p className="flex items-center gap-2"><CalendarDays className="size-4 text-accent-strong" /> 4 Saturdays from 14 Nov 2026</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-accent-strong" /> BGC, Taguig + Zoom</p>
            </div>
            <p className="mt-4 text-sm text-ink-muted">Early-bird <span className="line-through">₱18,000</span></p>
            <p className="font-heading text-3xl">₱15,300</p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3 text-sm">
          {[GraduationCap, Users, CalendarDays].map((Icon, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-3">
              <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent-strong"><Icon className="size-5" /></span>
              <p className="mt-2">{["Doctorate faculty", "Small cohorts", "2–5 day intensives"][i]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="min-h-dvh bg-muted">
      <header className="p-6">
        <h1 className="text-3xl">Praxis Center: two visual directions</h1>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Both share the same component library and layout; only the design tokens (colors, typefaces) differ. The live site currently uses
          direction <strong>{process.env.NEXT_PUBLIC_THEME === "b" ? "B" : "A"}</strong>.
        </p>
      </header>
      <div className="grid gap-px bg-border lg:grid-cols-2">
        {directions.map((d) => <Direction key={d.id} {...d} />)}
      </div>
    </div>
  );
}
