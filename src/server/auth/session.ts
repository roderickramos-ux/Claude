import "server-only";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db/client";
import { isDevLoginEnabled, isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sign, unsign } from "./crypto";

export type Role = (typeof schema.userRole.enumValues)[number];
export type SessionUser = { id: string; email: string; fullName: string | null; role: Role };

const RANK: Record<Role, number> = { participant: 0, staff: 1, admin: 2, super_admin: 3 };
export const DEV_COOKIE = "praxis_dev_session";

export function hasRole(user: Pick<SessionUser, "role"> | null, min: Role): boolean {
  return !!user && RANK[user.role] >= RANK[min];
}

function bootstrapRole(email: string): Role {
  const supers = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return supers.includes(email.toLowerCase()) ? "super_admin" : "participant";
}

/** Finds or creates the profile for an authenticated identity. */
export async function upsertProfile(identity: { id: string; email: string; fullName?: string | null }) {
  const email = identity.email.toLowerCase();
  const existing = await db.query.profiles.findFirst({ where: eq(schema.profiles.email, email) });
  const boot = bootstrapRole(email);
  if (existing) {
    const role = RANK[boot] > RANK[existing.role] ? boot : existing.role;
    const [row] = await db
      .update(schema.profiles)
      .set({ role, lastSignInAt: new Date(), fullName: existing.fullName ?? identity.fullName ?? null })
      .where(eq(schema.profiles.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(schema.profiles)
    .values({ id: identity.id, email, fullName: identity.fullName ?? null, role: boot, lastSignInAt: new Date() })
    .returning();
  return row;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  let email: string | null = null;

  if (isSupabaseAuthEnabled) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  }
  if (!email && isDevLoginEnabled) {
    email = unsign((await cookies()).get(DEV_COOKIE)?.value);
  }
  if (!email) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(sql`lower(${schema.profiles.email})`, email.toLowerCase()),
  });
  if (!profile) return null;
  return { id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role };
});

/** For admin pages and server actions. Redirects to login or renders 403. */
export async function requireRole(min: Role = "staff", returnTo = "/admin"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!hasRole(user, min)) forbidden();
  return user;
}

export async function setDevSession(email: string) {
  if (!isDevLoginEnabled) throw new Error("Dev login disabled");
  (await cookies()).set(DEV_COOKIE, sign(email.toLowerCase()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function signOut() {
  (await cookies()).delete(DEV_COOKIE);
  if (isSupabaseAuthEnabled) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
}
