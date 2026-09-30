import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "Praxis Center for Advanced Management",
    template: "%s | Praxis Center",
  },
  description:
    "Doctorate-led, practice-focused professional training in the Philippines. Short intensive programs in project management, data management and leadership.",
  applicationName: "Praxis Center",
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "Praxis Center for Advanced Management",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#1b3f7a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-PH"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${sourceSans.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
