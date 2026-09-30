import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, FileField, TextAreaField, TextField } from "@/components/admin/fields";
import { AdminHeader, FormSection } from "@/components/admin/ui";
import { Card } from "@/components/ui/misc";
import { saveSiteSettings } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { publicFileUrl } from "@/server/storage";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const s = await getSettings();
  return (
    <>
      <AdminHeader title="Site settings" description="Branding, contact details, social links, payment hold and privacy settings." />
      <Card className="p-6 sm:p-8">
        <AdminForm action={saveSiteSettings} className="grid">
          <FormSection title="Brand" description="Upload the logo in color (for light backgrounds) and a white version (for the dark footer). SVG or PNG recommended.">
            <TextField name="businessName" label="Registered business name" defaultValue={s.businessName} />
            <TextField name="shortName" label="Short name" defaultValue={s.shortName} />
            <TextField name="tagline" label="Tagline" defaultValue={s.tagline} />
            <FileField name="logo" label="Logo (for light backgrounds)" accept="image/svg+xml,image/png,image/webp,image/jpeg" current={publicFileUrl(s.logoPath)} removeName="removeLogo" />
            <FileField name="logoLight" label="Logo (white, for dark backgrounds)" accept="image/svg+xml,image/png,image/webp" current={publicFileUrl(s.logoLightPath)} removeName="removeLogoLight" />
          </FormSection>
          <FormSection title="Contact" description="Shown in the footer, contact page and emails.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="contactEmail" label="Contact email" type="email" defaultValue={s.contactEmail} />
              <TextField name="contactPhone" label="Phone / mobile" defaultValue={s.contactPhone} />
            </div>
            <TextField name="address" label="Address" defaultValue={s.address} />
            <TextField name="adminNotificationEmails" label="Admin alert recipients" defaultValue={s.adminNotificationEmails.join(", ")} hint="Comma-separated. They receive new-order, proof-of-payment and inquiry alerts." />
          </FormSection>
          <FormSection title="Social media">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="facebook" label="Facebook page URL" defaultValue={s.socials.facebook} />
              <TextField name="linkedin" label="LinkedIn page URL" defaultValue={s.socials.linkedin} />
              <TextField name="instagram" label="Instagram URL" defaultValue={s.socials.instagram} />
              <TextField name="youtube" label="YouTube URL" defaultValue={s.socials.youtube} />
              <TextField name="tiktok" label="TikTok URL" defaultValue={s.socials.tiktok} />
              <TextField name="messenger" label="Messenger link (m.me/…)" defaultValue={s.socials.messenger} />
              <TextField name="viber" label="Viber number" defaultValue={s.socials.viber} />
            </div>
          </FormSection>
          <FormSection title="Orders & documents" description="Order numbers look like PREFIX-2026-00001. Documents are acknowledgments, not BIR receipts.">
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField name="orderNumberPrefix" label="Order number prefix" defaultValue={s.orderNumberPrefix} />
              <TextField name="paymentHoldDays" label="Seat hold (days)" type="number" defaultValue={s.paymentHoldDays} />
              <TextField name="businessTin" label="Business TIN" defaultValue={s.businessTin} />
            </div>
            <TextField name="taxNote" label="Tax note on documents" defaultValue={s.taxNote} />
            <TextAreaField name="billCompanyInstructions" label="“Bill my company” instructions" markdown rows={3} defaultValue={s.billCompanyInstructions} />
          </FormSection>
          <FormSection title="Announcement bar" description="A thin banner at the top of every page.">
            <CheckField name="announcementEnabled" label="Show announcement" defaultChecked={s.announcement.enabled} />
            <TextField name="announcementText" label="Text" defaultValue={s.announcement.text} placeholder="Early-bird rates end 31 October!" />
            <TextField name="announcementHref" label="Link (optional)" defaultValue={s.announcement.href} placeholder="/courses/practical-project-management" />
          </FormSection>
          <FormSection title="Data privacy (RA 10173)" description="Shown on the Privacy Policy page and in the footer.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="dpoName" label="Data Protection Officer" defaultValue={s.dpo.name} />
              <TextField name="dpoEmail" label="DPO email" type="email" defaultValue={s.dpo.email} />
            </div>
          </FormSection>
        </AdminForm>
      </Card>
    </>
  );
}
