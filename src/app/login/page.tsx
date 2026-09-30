import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/misc";
import { isDevLoginEnabled, isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { devSignIn, signInWithGoogle } from "@/server/actions/auth";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import { MagicLinkForm } from "./magic-link-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/admin";
  const user = await getCurrentUser();
  if (user && hasRole(user, "staff")) redirect(next);

  return (
    <div className="grid min-h-dvh place-items-center bg-muted px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-8 text-3xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">Staff access to the Praxis admin panel.</p>
        {sp.error && <Alert tone="danger" className="mt-4">Sign-in failed. Please try again.</Alert>}
        {user && !hasRole(user, "staff") && (
          <Alert tone="warning" className="mt-4">You are signed in as {user.email}, which does not have admin access.</Alert>
        )}
        <div className="mt-6 space-y-6">
          {isSupabaseAuthEnabled && (
            <>
              <MagicLinkForm next={next} />
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={next} />
                <Button type="submit" variant="outline" className="w-full">Continue with Google</Button>
              </form>
            </>
          )}
          {isDevLoginEnabled && (
            <form action={devSignIn} className="space-y-3 rounded-lg border border-dashed border-warning/60 bg-warning-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">Development login (disabled in production)</p>
              <input type="hidden" name="next" value={next} />
              <Label htmlFor="dev-email">Email</Label>
              <Input id="dev-email" name="email" type="email" required placeholder="an email listed in SUPER_ADMIN_EMAILS" />
              <Button type="submit" variant="outline" className="w-full">Sign in (dev)</Button>
            </form>
          )}
          {!isSupabaseAuthEnabled && !isDevLoginEnabled && (
            <Alert tone="warning">Authentication is not configured. Set the Supabase environment variables.</Alert>
          )}
        </div>
      </Card>
    </div>
  );
}
