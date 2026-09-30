"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDevLoginEnabled, isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";
import { setDevSession, signOut, upsertProfile } from "../auth/session";
import { rateLimit } from "../ratelimit";

export type AuthState = { ok?: boolean; message?: string } | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/admin";
};

export async function sendMagicLink(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseAuthEnabled) return { message: "Email sign-in is not configured." };
  const rl = await rateLimit("auth", 5, 600);
  if (!rl.ok) return { message: "Too many attempts. Try again in a few minutes." };
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { message: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}`) },
  });
  if (error) return { message: error.message };
  return { ok: true, message: "Check your inbox for a sign-in link." };
}

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseAuthEnabled) return;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}`) },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function devSignIn(formData: FormData) {
  if (!isDevLoginEnabled) redirect("/login");
  const email = z.string().trim().toLowerCase().email().parse(formData.get("email"));
  await upsertProfile({ id: crypto.randomUUID(), email });
  await setDevSession(email);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await signOut();
  redirect("/login");
}
