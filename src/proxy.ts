import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request:
 *  1. Coming-soon mode: rewrites public pages to /coming-soon unless the visitor has the preview cookie.
 *  2. Captures UTM parameters and ?ref= referral codes into cookies for attribution at checkout.
 *  3. Refreshes the Supabase auth session on authenticated areas.
 */
const COMING_SOON_ALLOW = [
  "/coming-soon",
  "/admin",
  "/login",
  "/auth",
  "/api",
  "/privacy",
  "/terms",
  "/preview",
  "/styleguide",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/icon",
  "/favicon.ico",
];
const PREVIEW_COOKIE = "praxis_preview";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function isAllowed(pathname: string) {
  return COMING_SOON_ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const comingSoon = process.env.SITE_MODE === "coming_soon";
  const previewKey = process.env.PREVIEW_KEY;

  // Preview bypass: /preview?key=... sets a cookie and returns home.
  if (pathname === "/preview") {
    const res = NextResponse.redirect(new URL("/", request.url));
    if (previewKey && searchParams.get("key") === previewKey) {
      res.cookies.set(PREVIEW_COOKIE, previewKey, { httpOnly: true, sameSite: "lax", maxAge: THIRTY_DAYS, path: "/" });
    } else if (searchParams.get("exit") !== null) {
      res.cookies.delete(PREVIEW_COOKIE);
    }
    return res;
  }

  const hasPreview = !!previewKey && request.cookies.get(PREVIEW_COOKIE)?.value === previewKey;
  let response: NextResponse;
  if (comingSoon && !hasPreview && !isAllowed(pathname)) {
    response = NextResponse.rewrite(new URL("/coming-soon", request.url));
  } else if (!comingSoon && pathname === "/coming-soon") {
    response = NextResponse.redirect(new URL("/", request.url));
  } else {
    response = NextResponse.next({ request });
  }

  // Attribution cookies (last-touch for UTM, first seen referrer/landing page).
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = searchParams.get(k);
    if (v) utm[k.replace("utm_", "")] = v.slice(0, 120);
  }
  if (Object.keys(utm).length > 0) {
    utm.landing = pathname.slice(0, 200);
    const ref = request.headers.get("referer");
    if (ref) utm.referrer = ref.slice(0, 200);
    response.cookies.set("praxis_utm", JSON.stringify(utm), { sameSite: "lax", maxAge: THIRTY_DAYS, path: "/" });
  } else if (!request.cookies.get("praxis_utm")) {
    const ref = request.headers.get("referer");
    if (ref && !ref.startsWith(request.nextUrl.origin)) {
      response.cookies.set("praxis_utm", JSON.stringify({ referrer: ref.slice(0, 200), landing: pathname }), {
        sameSite: "lax",
        maxAge: THIRTY_DAYS,
        path: "/",
      });
    }
  }
  const refCode = searchParams.get("ref");
  if (refCode && /^[A-Za-z0-9-]{3,32}$/.test(refCode)) {
    response.cookies.set("praxis_ref", refCode.toUpperCase(), { sameSite: "lax", maxAge: THIRTY_DAYS, path: "/" });
  }

  // Keep Supabase sessions fresh where auth matters.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && /^\/(admin|login|auth|account)/.test(pathname)) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|pdf)$).*)"],
};
