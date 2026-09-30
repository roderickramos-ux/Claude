"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form";
import { Turnstile } from "@/components/turnstile";
import { subscribe, type FormState } from "@/server/actions/public";
import { cn } from "@/lib/utils";

export function NewsletterForm({
  source = "website",
  tone = "dark",
  withName = false,
  interests,
  submitLabel = "Keep me posted",
}: {
  source?: string;
  tone?: "dark" | "light";
  withName?: boolean;
  interests?: string[];
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, undefined);
  const light = tone === "light";
  if (state?.ok) {
    return (
      <p role="status" className={cn("rounded-lg px-4 py-3 text-sm", light ? "bg-white/10 text-white" : "bg-success-soft text-success")}>
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className={cn("grid gap-2", withName ? "sm:grid-cols-[1fr_1.3fr_auto]" : "sm:grid-cols-[1fr_auto]")}>
        {withName && (
          <Input name="fullName" placeholder="Your name" aria-label="Your name" autoComplete="name" />
        )}
        <Input
          name="email"
          type="email"
          required
          placeholder="Work email"
          aria-label="Email address"
          autoComplete="email"
          aria-invalid={state?.errors?.email ? true : undefined}
        />
        <Button type="submit" variant={light ? "accent" : "primary"} disabled={pending}>
          {pending ? "Submitting…" : submitLabel}
        </Button>
      </div>
      {interests && interests.length > 0 && (
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <legend className={cn("mb-1 text-sm", light ? "text-white/80" : "text-ink-muted")}>I&apos;m interested in:</legend>
          {interests.map((i) => (
            <label key={i} className={cn("flex items-center gap-2 text-sm", light ? "text-white" : "text-ink")}>
              <Checkbox name="interests" value={i} defaultChecked /> {i}
            </label>
          ))}
        </fieldset>
      )}
      <label className={cn("flex items-start gap-2 text-xs leading-relaxed", light ? "text-white/75" : "text-ink-muted")}>
        <Checkbox name="consent" required />
        <span>
          I agree to receive program updates and offers by email. I can unsubscribe anytime. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Turnstile />
      {(state?.message || state?.errors) && (
        <p role="alert" className={cn("text-sm", light ? "text-accent" : "text-danger")}>
          {state?.message ?? Object.values(state?.errors ?? {})[0]}
        </p>
      )}
    </form>
  );
}
