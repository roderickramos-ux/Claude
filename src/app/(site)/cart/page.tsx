import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PriceSummary } from "@/components/checkout/price-summary";
import { formatLabel } from "@/components/catalog/labels";
import { scheduleSummary } from "@/components/catalog/schedule";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Alert, Card, Container } from "@/components/ui/misc";
import { removeCartLine, updateCartLine } from "@/server/actions/public";
import { getCartView } from "@/server/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCartView();
  return (
    <Container className="py-12">
      <h1 className="text-4xl text-ink">Your cart</h1>
      {cart.lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-lg text-ink">Your cart is empty.</p>
          <Button asChild className="mt-5"><Link href="/courses">Browse programs</Link></Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            {cart.lines.map((l) => {
              const max = Math.max(1, Math.min(20, l.run.seatsLeft));
              const options = Array.from({ length: Math.max(max, l.seats) }, (_, i) => i + 1);
              return (
                <Card key={l.run.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl text-ink"><Link href={`/courses/${l.course.slug}`} className="hover:text-primary">{l.course.title}</Link></h2>
                      <p className="mt-1 text-sm text-ink-muted">Batch {l.run.code} · {formatLabel[l.run.format]}</p>
                      <p className="text-sm text-ink-muted">{scheduleSummary(l.run.sessions, l.run.startDate, l.run.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={updateCartLine} className="flex items-center gap-2">
                        <input type="hidden" name="runId" value={l.run.id} />
                        <label htmlFor={`s-${l.run.id}`} className="text-sm text-ink-muted">Seats</label>
                        <Select id={`s-${l.run.id}`} name="seats" defaultValue={String(l.seats)} className="h-10 w-20">
                          {options.map((n) => <option key={n} value={n}>{n}</option>)}
                        </Select>
                        <Button type="submit" size="sm" variant="outline">Update</Button>
                      </form>
                      <form action={removeCartLine}>
                        <input type="hidden" name="runId" value={l.run.id} />
                        <Button type="submit" size="icon" variant="ghost" aria-label={`Remove ${l.course.title}`}><Trash2 /></Button>
                      </form>
                    </div>
                  </div>
                  {l.problem && <Alert tone="danger" className="mt-4">{l.problem}</Alert>}
                  {!l.problem && l.run.groupDiscountPercent > 0 && l.seats < l.run.groupMinSeats && (
                    <p className="mt-4 text-sm text-accent-strong">
                      Add {l.run.groupMinSeats - l.seats} more {l.run.groupMinSeats - l.seats === 1 ? "seat" : "seats"} to qualify for the {l.run.groupDiscountPercent}% group rate.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <h2 className="text-2xl text-ink">Summary</h2>
              <div className="mt-5">{cart.pricing ? <PriceSummary pricing={cart.pricing} /> : <p className="text-sm text-ink-muted">Nothing to price yet.</p>}</div>
              {cart.referral && <p className="mt-4 text-sm text-ink-muted">Referred by {cart.referral.referrerName} ({cart.referral.code})</p>}
              <Button asChild size="lg" className="mt-6 w-full" disabled={cart.hasProblems || !cart.pricing}>
                {cart.hasProblems || !cart.pricing ? <span aria-disabled>Fix cart to continue</span> : <Link href="/checkout">Proceed to checkout</Link>}
              </Button>
              <p className="mt-4 text-xs text-ink-muted">You&apos;ll enter attendee details next. Seats are held while you complete payment.</p>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  );
}
