import { asc } from "drizzle-orm";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, FileField, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { AdminHeader } from "@/components/admin/ui";
import { Badge, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { savePaymentChannel } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";
import { publicFileUrl } from "@/server/storage";

export const metadata = { title: "Payment channels" };

type Channel = typeof schema.paymentChannels.$inferSelect;

function ChannelFields({ c }: { c?: Channel }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="label" label="Label shown to buyers" defaultValue={c?.label} required />
        <TextField name="code" label="Code" defaultValue={c?.code} hint="e.g. gcash, bpi, qrph" required />
        <SelectField name="kind" label="Type" defaultValue={c?.kind ?? "ewallet"} options={[{ value: "ewallet", label: "E-wallet" }, { value: "qrph", label: "QR Ph" }, { value: "bank", label: "Bank" }]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="accountName" label="Account name" defaultValue={c?.accountName} />
        <TextField name="accountNumber" label="Account / mobile number" defaultValue={c?.accountNumber} />
      </div>
      <FileField name="qrImage" label="QR code image" accept="image/png,image/jpeg,image/webp" current={publicFileUrl(c?.qrImagePath)} removeName="removeQr" hint="Download the QR from your GCash/BPI app and upload it here." />
      <TextAreaField name="instructions" label="Instructions" markdown rows={3} defaultValue={c?.instructions} />
      <div className="flex flex-wrap items-center gap-6">
        <CheckField name="isActive" label="Active (shown at checkout)" defaultChecked={c?.isActive ?? true} />
        <TextField name="sortOrder" label="Sort order" type="number" defaultValue={c?.sortOrder ?? 0} className="w-32" />
      </div>
    </>
  );
}

export default async function PaymentChannelsAdmin() {
  await requireRole("admin");
  const channels = await db.query.paymentChannels.findMany({ orderBy: [asc(schema.paymentChannels.sortOrder)] });
  return (
    <>
      <AdminHeader title="Payment channels" description="Offline payment options shown on the order page: GCash, QR Ph, BPI, etc. Online gateways (PayMongo) can be added later." />
      <div className="space-y-6">
        {channels.map((c) => (
          <Card key={c.id} className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-sans text-lg font-semibold text-ink">{c.label}</h2>
              <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "active" : "inactive"}</Badge>
              {!c.qrImagePath && <Badge tone="warning">no QR uploaded</Badge>}
            </div>
            <AdminForm action={savePaymentChannel}><ChannelFields c={c} /></AdminForm>
          </Card>
        ))}
        <Card className="p-6">
          <h2 className="mb-4 font-sans text-lg font-semibold text-ink">Add a channel</h2>
          <AdminForm action={savePaymentChannel} submitLabel="Add channel" resetOnSuccess><ChannelFields /></AdminForm>
        </Card>
      </div>
    </>
  );
}
