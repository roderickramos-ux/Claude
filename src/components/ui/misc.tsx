import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface", className)} {...props} />;
}

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-ink-muted",
      primary: "bg-primary-soft text-primary",
      accent: "bg-accent-soft text-accent-strong",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      danger: "bg-danger-soft text-danger",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const alertVariants = cva("rounded-lg border px-4 py-3 text-sm leading-relaxed", {
  variants: {
    tone: {
      info: "border-primary/20 bg-primary-soft text-primary",
      success: "border-success/30 bg-success-soft text-success",
      warning: "border-warning/30 bg-warning-soft text-warning",
      danger: "border-danger/30 bg-danger-soft text-danger",
    },
  },
  defaultVariants: { tone: "info" },
});

export function Alert({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role={tone === "danger" ? "alert" : "status"} className={cn(alertVariants({ tone }), className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong", className)}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="text-3xl leading-tight text-ink sm:text-4xl">{title}</h2>
      {lead && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{lead}</p>}
    </div>
  );
}

/** Highlights sample content that must be replaced before launch. */
export function PlaceholderNote({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-dashed border-warning/50 bg-warning-soft px-3 py-2 text-xs text-warning",
        className,
      )}
    >
      {children ?? "Placeholder content — replace in Admin before launch."}
    </p>
  );
}
