import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckField, SelectField, TextField } from "@/components/admin/fields";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Badge, Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { absoluteUrl } from "@/lib/utils";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import { saveReferralCode, setRewardStatus } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Referrals" };

type Code = typeof schema.referralCodes.$inferSelect;

function CodeFields({ c }: { c?: Code }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="code" label="Code" defaultValue={c?.code} placeholder="JUAN-DELACRUZ" required />
        <TextField name="referrerName" label="Referrer name" defaultValue={c?.referrerName} required />
        <TextField name="referrerEmail" label="Referrer email" defaultValue={c?.referrerEmail} hint="Prevents self-referral" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <SelectField name="rewardType" label="Referrer reward" defaultValue={c?.rewardType ?? "fixed_per_seat"} options={[{ value: "fixed_per_seat", label: "₱ per paid seat" }, { value: "percent", label: "% of order total" }]} />
        <TextField name="rewardValue" label="Reward amount" defaultValue={c ? (c.rewardType === "percent" ? c.rewardValue : centavosToPesosInput(c.rewardValue)) : "500"} hint="Pesos or percent" />
        <TextField name="buyerDiscountPercent" label="Buyer discount (%)" type="number" defaultValue={c?.buyerDiscountPercent ?? 0} hint="Optional incentive for the buyer" />
        <TextField name="maxUses" label="Max orders" type="number" defaultValue={c?.maxUses ?? ""} hint="Blank = unlimited" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="referrerMobile" label="Referrer mobile (for payout)" defaultValue={c?.referrerMobile} />
        <TextField name="notes" label="Notes" defaultValue={c?.notes} />
      </div>
      <CheckField name="isActive" label="Active" defaultChecked={c?.isActive ?? true} />
    </>
  );
}

export default async function ReferralsAdmin() {
  await requireRole("staff");
  const [codes, rewards, usage] = await Promise.all([
    db.query.referralCodes.findMany({ orderBy: [desc(schema.referralCodes.createdAt)] }),
    db.query.referralRewards.findMany({ orderBy: [desc(schema.referralRewards.createdAt)], with: { code: true, order: true } }),
    db
      .select({ id: schema.orders.referralCodeId, n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(sql`${schema.orders.referralCodeId} is not null and ${schema.orders.status} not in ('cancelled','expired')`)
      .groupBy(schema.orders.referralCodeId),
  ]);
  const used = new Map(usage.map((u) => [u.id, u.n]));
  return (
    <>
      <AdminHeader title="Referrals" description="Give alumni, faculty and partners a code. Rewards are recorded automatically when referred orders are paid. Pay them out manually, then mark them paid." />
      <h2 className="mb-3 font-sans text-lg font-semibold text-ink">Rewards owed</h2>
      <Table>
        <thead><tr><th>Referrer</th><th>Order</th><th>Reward</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rewards.length === 0 && <tr><td colSpan={5} className="text-ink-muted">No rewards yet.</td></tr>}
          {rewards.map((r) => (
            <tr key={r.id}>
              <td>{r.code.referrerName}<span className="block text-xs text-ink-muted">{r.code.code}{r.code.referrerMobile && ` · ${r.code.referrerMobile}`}</span></td>
              <td><Link href={`/admin/orders/${r.orderId}`} className="text-primary hover:underline">{r.order.orderNumber}</Link></td>
              <td>{formatPHP(r.amountCentavos)}</td>
              <td><Badge tone={r.status === "paid" ? "success" : r.status === "void" ? "neutral" : "warning"}>{r.status}</Badge></td>
              <td className="text-right">
                {r.status === "pending" && (
                  <form action={setRewardStatus} className="inline"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="paid" /><button className="text-sm text-primary" type="submit">Mark paid</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h2 className="mb-3 mt-10 font-sans text-lg font-semibold text-ink">Referral codes</h2>
      <div className="space-y-3">
        {codes.map((c) => (
          <details key={c.id} className="rounded-xl border border-border bg-surface">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
              <span><strong className="text-ink">{c.code}</strong> <span className="text-ink-muted">· {c.referrerName}</span></span>
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                {used.get(c.id) ?? 0} orders
                <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "active" : "inactive"}</Badge>
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <p className="mb-4 text-sm text-ink-muted">Share link: <code className="rounded bg-muted px-1.5 py-0.5">{absoluteUrl(`/?ref=${c.code}`)}</code></p>
              <AdminForm action={saveReferralCode}><CodeFields c={c} /></AdminForm>
            </div>
          </details>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">New referral code</h2>
        <AdminForm action={saveReferralCode} submitLabel="Create code" resetOnSuccess><CodeFields /></AdminForm>
      </Card>
    </>
  );
}
