"use client";

import Link from "next/link";
import Script from "next/script";
import { useSyncExternalStore } from "react";

type Consent = "all" | "necessary" | null;
const KEY = "praxis_consent";
const listeners = new Set<() => void>();

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

function write(v: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: consent lasts for this page view only */
  }
  document.cookie = `${KEY}=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Returns undefined during SSR so nothing renders until we know the stored choice. */
function useConsent(): Consent | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function CookieConsent() {
  const consent = useConsent();
  if (consent !== null) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-border bg-surface p-4 shadow-xl sm:inset-x-6 sm:p-5"
    >
      <p className="text-sm leading-relaxed text-ink">
        We use essential cookies to run this site (for example, your cart). With your permission, we also use
        analytics and marketing cookies to understand how visitors find us. See our{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => write("necessary")}
          className="h-10 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-muted"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => write("all")}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink hover:bg-primary-hover"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

/** Loads GA4 and Meta Pixel only after the visitor accepts analytics cookies. */
export function Analytics() {
  const consent = useConsent();
  const ga = process.env.NEXT_PUBLIC_GA4_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (consent !== "all") return null;
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
