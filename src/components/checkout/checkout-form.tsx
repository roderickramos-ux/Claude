"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/misc";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";
import { placeOrder, type CheckoutState } from "@/server/actions/checkout";

type Attendee = {
  fullName: string;
  email: string;
  mobile: string;
  jobTitle: string;
  organizationName: string;
  dietaryNeeds: string;
  accessibilityNeeds: string;
};

const emptyAttendee = (): Attendee => ({
  fullName: "",
  email: "",
  mobile: "",
  jobTitle: "",
  organizationName: "",
  dietaryNeeds: "",
  accessibilityNeeds: "",
});

export type CheckoutLine = { runId: string; label: string; seats: number };
export type CheckoutChannel = { code: string; label: string; kind: string };

export function CheckoutForm({
  lines,
  channels,
  initialReferral,
  holdDays,
}: {
  lines: CheckoutLine[];
  channels: CheckoutChannel[];
  initialReferral: string;
  holdDays: number;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, undefined);
  const errors = state?.errors ?? {};

  const [buyer, setBuyer] = useState({ fullName: "", email: "", mobile: "" });
  const [billing, setBilling] = useState({ name: "", company: "", address: "", tin: "" });
  const [attending, setAttending] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[][]>(() =>
    lines.map((l) => Array.from({ length: l.seats }, emptyAttendee)),
  );
  const [paymentMethod, setPaymentMethod] = useState<"channel" | "bill_company">("channel");
  const [channelCode, setChannelCode] = useState(channels[0]?.code ?? "");
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const setAttendee = (li: number, ai: number, patch: Partial<Attendee>) =>
    setAttendees((prev) => prev.map((row, i) => (i !== li ? row : row.map((a, j) => (j === ai ? { ...a, ...patch } : a)))));

  // When the buyer is attending, the first seat mirrors the buyer's details.
  const effectiveAttendees = attendees.map((row, li) =>
    row.map((a, ai) =>
      attending && li === 0 && ai === 0
        ? { ...a, fullName: buyer.fullName, email: buyer.email, mobile: buyer.mobile, organizationName: a.organizationName || billing.company }
        : { ...a, organizationName: a.organizationName || billing.company },
    ),
  );

  const payload = JSON.stringify({
    buyer,
    billing,
    lines: lines.map((l, li) => ({ runId: l.runId, attendees: effectiveAttendees[li] })),
    paymentMethod,
    channelCode: paymentMethod === "channel" ? channelCode : undefined,
    referralCode: referralCode || undefined,
    agreeTerms,
    marketingOptIn,
  });

  const err = (path: string) => errors[path];

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="payload" value={payload} />

      <Card className="p-6 sm:p-8">
        <h2 className="text-2xl text-ink">1. Your details</h2>
        <p className="mt-1 text-sm text-ink-muted">We&apos;ll send the confirmation and payment instructions to this email.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Full name" name="buyer.fullName" error={err("buyer.fullName")} required className="sm:col-span-2">
            <Input autoComplete="name" value={buyer.fullName} onChange={(e) => setBuyer({ ...buyer, fullName: e.target.value })} />
          </Field>
          <Field label="Email" name="buyer.email" error={err("buyer.email")} required>
            <Input type="email" autoComplete="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
          </Field>
          <Field label="Mobile number" name="buyer.mobile" error={err("buyer.mobile")} required>
            <Input type="tel" autoComplete="tel" placeholder="0917 123 4567" value={buyer.mobile} onChange={(e) => setBuyer({ ...buyer, mobile: e.target.value })} />
          </Field>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm text-ink">
          <Checkbox checked={attending} onChange={(e) => setAttending(e.target.checked)} />
          I am one of the attendees
        </label>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-2xl text-ink">2. Attendees</h2>
        <p className="mt-1 text-sm text-ink-muted">Enter the details of each participant. Confirmation emails are sent to each attendee.</p>
        <div className="mt-6 space-y-8">
          {lines.map((line, li) => (
            <div key={line.runId}>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-accent-strong">{line.label}</h3>
              <div className="mt-4 space-y-5">
                {attendees[li].map((a, ai) => {
                  const mirrored = attending && li === 0 && ai === 0;
                  const base = `lines.${li}.attendees.${ai}`;
                  return (
                    <fieldset key={ai} className="rounded-lg border border-border p-4 sm:p-5">
                      <legend className="px-1 text-sm font-medium text-ink">
                        Seat {ai + 1}
                        {mirrored && <span className="ml-2 font-normal text-ink-muted">(you)</span>}
                      </legend>
                      {mirrored ? (
                        <p className="text-sm text-ink-muted">
                          {buyer.fullName || "Your name"} · {buyer.email || "your email"}
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Full name" name={`${base}.fullName`} error={err(`${base}.fullName`)} required>
                            <Input value={a.fullName} onChange={(e) => setAttendee(li, ai, { fullName: e.target.value })} />
                          </Field>
                          <Field label="Email" name={`${base}.email`} error={err(`${base}.email`)} required>
                            <Input type="email" value={a.email} onChange={(e) => setAttendee(li, ai, { email: e.target.value })} />
                          </Field>
                          <Field label="Mobile" name={`${base}.mobile`} error={err(`${base}.mobile`)}>
                            <Input type="tel" value={a.mobile} onChange={(e) => setAttendee(li, ai, { mobile: e.target.value })} />
                          </Field>
                          <Field label="Job title" name={`${base}.jobTitle`}>
                            <Input value={a.jobTitle} onChange={(e) => setAttendee(li, ai, { jobTitle: e.target.value })} />
                          </Field>
                        </div>
                      )}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-primary">Dietary or accessibility needs (optional)</summary>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          {mirrored && (
                            <Field label="Job title" name={`${base}.jobTitle`}>
                              <Input value={a.jobTitle} onChange={(e) => setAttendee(li, ai, { jobTitle: e.target.value })} />
                            </Field>
                          )}
                          <Field label="Dietary needs" name={`${base}.dietaryNeeds`}>
                            <Input value={a.dietaryNeeds} onChange={(e) => setAttendee(li, ai, { dietaryNeeds: e.target.value })} />
                          </Field>
                          <Field label="Accessibility needs" name={`${base}.accessibilityNeeds`}>
                            <Input value={a.accessibilityNeeds} onChange={(e) => setAttendee(li, ai, { accessibilityNeeds: e.target.value })} />
                          </Field>
                        </div>
                      </details>
                    </fieldset>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-2xl text-ink">3. Payment</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Your seats are held for {holdDays} days. After placing your order you&apos;ll see the QR codes and account details.
        </p>
        <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Payment option">
          {channels.map((c) => (
            <label
              key={c.code}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                paymentMethod === "channel" && channelCode === c.code ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="pay"
                className="size-4 accent-[var(--primary)]"
                checked={paymentMethod === "channel" && channelCode === c.code}
                onChange={() => {
                  setPaymentMethod("channel");
                  setChannelCode(c.code);
                }}
              />
              <span className="font-medium text-ink">{c.label}</span>
            </label>
          ))}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
              paymentMethod === "bill_company" ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
            )}
          >
            <input type="radio" name="pay" className="mt-1 size-4 accent-[var(--primary)]" checked={paymentMethod === "bill_company"} onChange={() => setPaymentMethod("bill_company")} />
            <span>
              <span className="font-medium text-ink">Bill my company</span>
              <span className="block text-sm text-ink-muted">Get a proforma invoice for your finance team.</span>
            </span>
          </label>
          {err("channelCode") && <p className="text-sm text-danger">{err("channelCode")}</p>}
        </div>

        <h3 className="mt-8 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Billing details {paymentMethod === "channel" && <span className="font-normal normal-case">(optional)</span>}
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Company / organization" name="billing.company" error={err("billing.company")} required={paymentMethod === "bill_company"}>
            <Input autoComplete="organization" value={billing.company} onChange={(e) => setBilling({ ...billing, company: e.target.value })} />
          </Field>
          <Field label="Billing name" name="billing.name" hint="Defaults to your name">
            <Input value={billing.name} onChange={(e) => setBilling({ ...billing, name: e.target.value })} />
          </Field>
          <Field label="Billing address" name="billing.address" error={err("billing.address")} required={paymentMethod === "bill_company"} className="sm:col-span-2">
            <Input autoComplete="street-address" value={billing.address} onChange={(e) => setBilling({ ...billing, address: e.target.value })} />
          </Field>
          <Field label="TIN" name="billing.tin" error={err("billing.tin")} hint="Optional">
            <Input inputMode="numeric" placeholder="000-000-000-000" value={billing.tin} onChange={(e) => setBilling({ ...billing, tin: e.target.value })} />
          </Field>
          <Field label="Referral code" name="referralCode" error={err("referralCode")} hint="Optional: from the person who referred you">
            <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-6 sm:p-8">
        <label className="flex items-start gap-3 text-sm text-ink">
          <Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} aria-invalid={err("agreeTerms") ? true : undefined} />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-primary underline">Terms of Registration</Link> and{" "}
            <Link href="/refund-policy" target="_blank" className="text-primary underline">Refund Policy</Link>, and I consent to Praxis
            Center processing the personal data above (mine and my attendees&apos;) to manage this registration, per the{" "}
            <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>. I confirm I am authorized to share
            my attendees&apos; details.
            {err("agreeTerms") && <span className="block text-danger">{err("agreeTerms")}</span>}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <Checkbox checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
          <span>Optional: send me news about upcoming programs and offers. I can unsubscribe anytime.</span>
        </label>
        <Turnstile />
        {state?.message && <Alert tone="danger">{state.message}</Alert>}
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
      </Card>
    </form>
  );
}
