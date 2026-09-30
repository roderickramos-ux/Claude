import { cn } from "@/lib/utils";

export function SeatsLeft({
  seatsLeft,
  capacity,
  status,
  className,
  tone = "dark",
}: {
  seatsLeft: number;
  capacity: number;
  status: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  const full = seatsLeft <= 0 || status === "full";
  const closed = status === "closed";
  const pct = capacity > 0 ? Math.round(((capacity - seatsLeft) / capacity) * 100) : 100;
  const low = !full && seatsLeft <= Math.max(5, Math.ceil(capacity * 0.2));
  const label = closed ? "Registration closed" : full ? "Fully booked" : low ? `Only ${seatsLeft} seats left` : `${seatsLeft} seats available`;
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", tone === "light" ? "text-white" : low || full ? "text-danger" : "text-ink")}>
          {label}
        </span>
        <span className={cn("text-xs", tone === "light" ? "text-white/70" : "text-ink-muted")}>Small cohort · {capacity} max</span>
      </div>
      <div
        className={cn("mt-2 h-1.5 overflow-hidden rounded-full", tone === "light" ? "bg-white/15" : "bg-muted")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Seats filled"
      >
        <div className={cn("h-full rounded-full", full || low ? "bg-danger" : "bg-accent")} style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}
