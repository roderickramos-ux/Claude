import { formatPHP } from "@/lib/money";
import type { PricingBreakdown } from "@/lib/pricing/types";

export function PriceSummary({ pricing, compact = false }: { pricing: PricingBreakdown; compact?: boolean }) {
  return (
    <dl className="space-y-3 text-sm">
      {pricing.lines.map((l) => (
        <div key={l.runId} className="space-y-1">
          <div className="flex justify-between gap-4">
            <dt className="text-ink">
              {l.label}
              <span className="block text-ink-muted">
                {l.seats} × {formatPHP(l.unitPriceCentavos)}
                {l.unitPriceCentavos !== l.regularUnitCentavos && (
                  <span className="ml-1 line-through">{formatPHP(l.regularUnitCentavos)}</span>
                )}
              </span>
            </dt>
            <dd className="shrink-0 font-medium text-ink">{formatPHP(l.lineTotalCentavos)}</dd>
          </div>
          {!compact && l.discountNotes.length > 0 && (
            <p className="text-xs text-success">{l.discountNotes.join(" · ")}: you save {formatPHP(l.discountCentavos)}</p>
          )}
        </div>
      ))}
      {pricing.adjustments.map((a) => (
        <div key={a.label} className="flex justify-between gap-4 text-success">
          <dt>{a.label}</dt>
          <dd className="shrink-0">{formatPHP(a.amountCentavos)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <dt className="font-medium text-ink">Total</dt>
        <dd className="font-heading text-3xl text-ink">{formatPHP(pricing.totalCentavos)}</dd>
      </div>
      {pricing.discountCentavos > 0 && (
        <p className="text-right text-xs text-success">Total savings {formatPHP(pricing.discountCentavos)}</p>
      )}
      {pricing.vatNote && <p className="text-right text-xs text-ink-muted">{pricing.vatNote}</p>}
    </dl>
  );
}
