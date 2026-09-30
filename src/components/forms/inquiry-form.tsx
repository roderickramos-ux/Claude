"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { Turnstile } from "@/components/turnstile";
import { submitInquiry, type FormState } from "@/server/actions/public";

export function InquiryForm({ type }: { type: "contact" | "corporate" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitInquiry, undefined);
  const e = state?.errors ?? {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" error={e.name} required>
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" name="email" error={e.email} required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Mobile / phone" name="phone" error={e.phone}>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label={type === "corporate" ? "Organization" : "Company (optional)"} name="company" error={e.company} required={type === "corporate"}>
          <Input name="company" autoComplete="organization" required={type === "corporate"} />
        </Field>
        {type === "corporate" && (
          <Field label="Estimated number of participants" name="headcount" error={e.headcount}>
            <Input name="headcount" type="number" min={1} inputMode="numeric" />
          </Field>
        )}
      </div>
      <Field
        label={type === "corporate" ? "What would you like your team to learn?" : "Message"}
        name="message"
        error={e.message}
        required
        hint={type === "corporate" ? "Topics, preferred dates, in-person or online, and any goals for the program." : undefined}
      >
        <Textarea name="message" rows={5} required />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-muted">
        <Checkbox name="consent" required aria-invalid={e.consent ? true : undefined} />
        <span>
          I agree to the processing of my information to respond to this inquiry, per the{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .{e.consent && <span className="block text-danger">{e.consent}</span>}
        </span>
      </label>
      <Turnstile />
      {state?.message && <Alert tone="danger">{state.message}</Alert>}
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : type === "corporate" ? "Request a proposal" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
