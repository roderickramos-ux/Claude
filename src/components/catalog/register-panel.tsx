import { CalendarDays, Download, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { addToCart } from "@/server/actions/public";
import type { CourseDetail } from "@/server/queries/catalog";
import { publicFileUrl } from "@/server/storage";
import { formatLabel } from "./labels";
import { PriceTag } from "./price";
import { locationSummary, scheduleSummary } from "./schedule";
import { SeatsLeft } from "./seats";

type Run = CourseDetail["runs"][number];

export function RegisterPanel({ run, brochurePath }: { run: Run; brochurePath?: string | null }) {
  const maxSeats = Math.min(run.seatsLeft, 20);
  const brochure = publicFileUrl(brochurePath);
  const groupSeats = Math.min(Math.max(run.groupMinSeats, 2), maxSeats);
  return (
    <Card className="p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Batch {run.code}</p>
      <ul className="mt-3 space-y-2 text-sm text-ink-muted">
        <li className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 text-accent-strong" aria-hidden />
          {scheduleSummary(run.sessions, run.startDate, run.endDate)}
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-accent-strong" aria-hidden />
          {formatLabel[run.format]} · {locationSummary(run)}
        </li>
      </ul>
      <PriceTag run={run} className="mt-5" />
      <SeatsLeft seatsLeft={run.seatsLeft} capacity={run.capacity} status={run.status} className="mt-5" />
      {run.isBookable ? (
        <div className="mt-6 space-y-3">
          <form action={addToCart} className="flex items-end gap-2">
            <input type="hidden" name="runId" value={run.id} />
            <div className="w-24">
              <Label htmlFor={`seats-${run.id}`}>Seats</Label>
              <Select id={`seats-${run.id}`} name="seats" defaultValue="1">
                {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="flex-1">Add to Cart</Button>
          </form>
          {maxSeats >= 2 && (
            <form action={addToCart}>
              <input type="hidden" name="runId" value={run.id} />
              <input type="hidden" name="seats" value={groupSeats} />
              <Button type="submit" variant="outline" className="w-full">
                <Users aria-hidden /> Register Team ({groupSeats} seats)
              </Button>
            </form>
          )}
          {run.registrationDeadline && (
            <p className="text-xs text-ink-muted">Registration closes {formatDateTime(run.registrationDeadline)}.</p>
          )}
        </div>
      ) : (
        <p className="mt-6 rounded-md bg-muted px-4 py-3 text-sm text-ink">
          {run.status === "draft" ? "Not yet open for registration." : "Registration for this batch is closed. Contact us to be notified of the next batch."}
        </p>
      )}
      {brochure && (
        <a href={brochure} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <Download className="size-4" aria-hidden /> Download brochure (PDF)
        </a>
      )}
    </Card>
  );
}
