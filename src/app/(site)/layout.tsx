import { Analytics, CookieConsent } from "@/components/site/consent";
import { Footer } from "@/components/site/footer";
import { AnnouncementBar, Header } from "@/components/site/header";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { cartSeatCount } from "@/server/cart";
import { getSettings } from "@/server/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, cartCount] = await Promise.all([getSettings(), cartSeatCount()]);
  return (
    <>
      <AnnouncementBar settings={settings} />
      <Header settings={settings} cartCount={cartCount} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <CookieConsent />
      <Analytics />
      <OrganizationJsonLd settings={settings} />
    </>
  );
}
