/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { publicFileUrl } from "@/server/storage";
import { cn } from "@/lib/utils";

/** Uses the uploaded logo (Admin → Settings) when present; otherwise a typographic wordmark. */
export function Logo({
  logoPath,
  variant = "dark",
  className,
}: {
  logoPath?: string;
  variant?: "dark" | "light";
  className?: string;
}) {
  const src = publicFileUrl(logoPath);
  return (
    <Link href="/" className={cn("inline-flex items-center gap-3", className)} aria-label="Praxis Center — home">
      {src ? (
        <img src={src} alt="Praxis Center for Advanced Management" className="h-10 w-auto sm:h-12" />
      ) : (
        <>
          <span
            aria-hidden
            className={cn(
              "grid size-10 place-items-center rounded-md font-heading text-2xl leading-none",
              variant === "dark" ? "bg-primary text-accent" : "bg-white/10 text-accent ring-1 ring-white/25",
            )}
          >
            P
          </span>
          <span className="flex flex-col leading-none">
            <span
              className={cn(
                "font-heading text-xl tracking-[0.2em] sm:text-2xl",
                variant === "dark" ? "text-primary" : "text-white",
              )}
            >
              PRAXIS
            </span>
            <span
              className={cn(
                "mt-1 text-[0.6rem] font-medium uppercase tracking-[0.16em] sm:text-[0.65rem]",
                variant === "dark" ? "text-ink-muted" : "text-white/70",
              )}
            >
              Center for Advanced Management
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
