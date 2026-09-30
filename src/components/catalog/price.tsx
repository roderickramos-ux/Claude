import { formatDateTime } from "@/lib/dates";
import { roundToPeso, isEarlyBird } from "@/lib/pricing/engine";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { RunRow } from "@/server/queries/catalog";

export function runPrices(run: RunRow, now = new Date()) {
  const eb = isEarlyBird(run, now);
  const earlyBird = run.earlyBirdPercent > 0 ? roundToPeso(run.regularPriceCentavos * (1 - run.earlyBirdPercent / 100)) : null;
  return { eb, earlyBird, regular: run.regularPriceCentavos };
}

export function PriceTag({ run, className, tone = "dark" }: { run: RunRow; className?: string; tone?: "dark" | "light" }) {
  const { eb, earlyBird, regular } = runPrices(run);
  const muted = tone === "light" ? "text-white/70" : "text-ink-muted";
  return (
    <div className={className}>
      {eb && earlyBird !== null ? (
        <>
          <p className={cn("text-sm", muted)}>
            Early-bird <span className="line-through">{formatPHP(regular)}</span>
          </p>
          <p className="font-heading text-4xl leading-tight">
            {formatPHP(earlyBird)} <span className={cn("font-sans text-sm font-normal", muted)}>per participant</span>
          </p>
          <p className={cn("mt-1 text-sm", tone === "light" ? "text-accent" : "text-accent-strong")}>
            Save {run.earlyBirdPercent}% until {formatDateTime(run.earlyBirdDeadline!)}
          </p>
        </>
      ) : (
        <p className="font-heading text-4xl leading-tight">
          {formatPHP(regular)} <span className={cn("font-sans text-sm font-normal", muted)}>per participant</span>
        </p>
      )}
      {run.groupDiscountPercent > 0 && (
        <p className={cn("mt-1 text-sm", muted)}>
          Group rate: {run.groupDiscountPercent}% off for {run.groupMinSeats}+ seats
        </p>
      )}
    </div>
  );
}
