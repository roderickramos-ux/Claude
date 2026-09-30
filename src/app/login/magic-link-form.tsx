"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { sendMagicLink, type AuthState } from "@/server/actions/auth";

export function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(sendMagicLink, undefined);
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" autoComplete="email" required />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</Button>
      {state?.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
    </form>
  );
}
