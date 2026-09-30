import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/server/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/admin";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      await upsertProfile({ id: data.user.id, email: data.user.email, fullName: data.user.user_metadata?.full_name ?? null });
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
