import Image from "next/image";
import { cn } from "@/lib/utils";
import { publicFileUrl } from "@/server/storage";

/**
 * Course/faculty imagery. When no photo is uploaded yet, renders a branded placeholder
 * (clearly labelled) instead of stock imagery.
 */
export function Cover({
  path,
  alt,
  label,
  className,
  priority,
  sizes = "(min-width: 1024px) 33vw, 100vw",
}: {
  path?: string | null;
  alt: string;
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = publicFileUrl(path);
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" unoptimized={src.startsWith("/api/")} />
      </div>
    );
  }
  return (
    <div
      className={cn("relative overflow-hidden bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)]", className)}
      role="img"
      aria-label={alt}
    >
      <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.12]" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="absolute -right-10 -top-10 size-40 rounded-full border border-accent/40" aria-hidden />
      <div className="absolute -right-4 -top-4 size-24 rounded-full border border-accent/30" aria-hidden />
      {label && (
        <span className="absolute bottom-4 left-4 right-4 font-heading text-xl leading-snug text-white/90">{label}</span>
      )}
    </div>
  );
}
