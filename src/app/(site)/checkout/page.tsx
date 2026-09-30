import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PriceSummary } from "@/components/checkout/price-summary";
import { Card, Container } from "@/components/ui/misc";
import { getCartView } from "@/server/cart-view";
import { listActivePaymentChannels } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, channels, settings] = await Promise.all([getCartView(), listActivePaymentChannels(), getSettings()]);
  if (cart.lines.length === 0 || !cart.pricing) redirect("/cart");
  if (cart.hasProblems) redirect("/cart");

  return (
    <Container className="py-12">
      <nav className="text-sm text-ink-muted"><Link href="/cart" className="hover:text-primary">← Back to cart</Link></nav>
      <h1 className="mt-3 text-4xl text-ink">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <CheckoutForm
          lines={cart.lines.map((l) => ({ runId: l.run.id, label: l.label, seats: l.seats }))}
          channels={channels.map((c) => ({ code: c.code, label: c.label, kind: c.kind }))}
          initialReferral={cart.referral?.code ?? ""}
          holdDays={settings.paymentHoldDays}
        />
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-2xl text-ink">Order summary</h2>
            <div className="mt-5"><PriceSummary pricing={cart.pricing} /></div>
            <p className="mt-4 text-xs text-ink-muted">Final prices are confirmed when you place the order. Referral discounts, if any, are applied then.</p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
