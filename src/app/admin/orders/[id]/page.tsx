import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { OrderStatusBadge, RegistrationStatusBadge } from "@/components/admin/status";
import { AdminHeader } from "@/components/admin/ui";
import { PriceSummary } from "@/components/checkout/price-summary";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/misc";
import { formatDateTime, toManilaDateTimeLocal } from "@/lib/dates";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import {
  cancelOrderAction,
  extendDueAction,
  recordPaymentAction,
  refundAction,
  rejectPaymentAction,
  resendConfirmationAction,
  saveOrderNotesAction,
  updateAttendeeAction,
  verifyPaymentAction,
} from "@/server/actions/admin/orders";
import { hasRole, requireRole } from "@/server/auth/session";
import { orderUrl } from "@/server/orders/access";
import { loadOrder } from "@/server/orders/load";
import { privateFileUrl } from "@/server/storage";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await requireRole("staff");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const order = await loadOrder({ id });
  if (!order) notFound();

  const verified = order.payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amountCentavos, 0);
  const refunded = order.refunds.reduce((s, r) => s + r.amountCentavos, 0);
  const balance = Math.max(0, order.totalCentavos - verified);
  const unpaid = ["pending_payment", "awaiting_verification", "expired"].includes(order.status);
  const proofUrls = await Promise.all(order.payments.map((p) => (p.proofPath ? privateFileUrl(p.proofPath) : null)));
  const isAdmin = hasRole(user, "admin");

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="text-ink-muted hover:text-primary">← Orders</Link></p>
      <AdminHeader
        title={order.orderNumber}
        description={<>Placed {formatDateTime(order.createdAt)} · <a className="text-primary underline" href={orderUrl(order)} target="_blank">Customer view ↗</a> · <a className="text-primary underline" href={`/orders/${order.orderNumber}/document`} target="_blank">PDF ↗</a></>}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-sans text-lg font-semibold text-ink">Payments</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Total {formatPHP(order.totalCentavos)} · Verified {formatPHP(verified)} · Balance <strong className="text-ink">{formatPHP(balance)}</strong>
              {refunded > 0 && <> · Refunded {formatPHP(refunded)}</>}
              {unpaid && <> · Hold until <strong className="text-ink">{formatDateTime(order.paymentDueAt)}</strong></>}
            </p>
            <div className="mt-5 space-y-4">
              {order.payments.length === 0 && <p className="text-sm text-ink-muted">No payments submitted yet.</p>}
              {order.payments.map((p, i) => (
                <div key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink">
                      {formatPHP(p.amountCentavos)} via {p.channelCode ?? "—"}
                      {p.referenceNumber && <span className="font-normal text-ink-muted"> · Ref {p.referenceNumber}</span>}
                    </p>
                    <Badge tone={p.status === "verified" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Submitted {formatDateTime(p.createdAt)}
                    {p.payerName && <> · Payer: {p.payerName}</>}
                    {p.verifiedAt && <> · Reviewed {formatDateTime(p.verifiedAt)}</>}
                    {p.rejectionReason && <> · Reason: {p.rejectionReason}</>}
                    {p.notes && <> · {p.notes}</>}
                  </p>
                  {proofUrls[i] && (
                    <a href={proofUrls[i]!} target="_blank" rel="noopener" className="mt-2 inline-block text-sm text-primary underline">View proof of payment ↗</a>
                  )}
                  {p.status === "submitted" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <AdminForm action={verifyPaymentAction} submitLabel="Verify payment" className="grid gap-2">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <p className="text-xs text-ink-muted">Check the amount and reference against your GCash/bank records first.</p>
                      </AdminForm>
                      <AdminForm action={rejectPaymentAction} submitLabel="Reject" confirm="Reject this payment? The buyer will be emailed." className="grid gap-2">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="orderId" value={order.id} />
                        <Input name="reason" placeholder="Reason shown to the buyer" aria-label="Rejection reason" />
                      </AdminForm>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {unpaid && (
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium text-primary">Record a payment received directly (check, bank deposit…)</summary>
                <AdminForm action={recordPaymentAction} submitLabel="Record verified payment" className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div><Label htmlFor="amt">Amount (₱)</Label><Input id="amt" name="amount" defaultValue={centavosToPesosInput(balance)} /></div>
                  <div><Label htmlFor="ch">Channel</Label><Input id="ch" name="channelCode" placeholder="e.g. check, bpi" /></div>
                  <div><Label htmlFor="ref">Reference</Label><Input id="ref" name="referenceNumber" /></div>
                  <div><Label htmlFor="nt">Notes</Label><Input id="nt" name="notes" /></div>
                </AdminForm>
              </details>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-lg font-semibold text-ink">Attendees</h2>
            <div className="mt-4 space-y-6">
              {order.items.map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-ink">
                    <Link href={`/admin/registrations?run=${item.runId}`} className="hover:text-primary">{item.label}</Link>
                    <span className="font-normal text-ink-muted"> · {item.seats} × {formatPHP(item.unitPriceCentavos)} ({item.priceBasis.replace("_", " ")})</span>
                  </p>
                  <ul className="mt-3 space-y-3">
                    {item.attendees.map((a) => (
                      <li key={a.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-ink">
                            <strong>{a.fullName}</strong> · {a.email}{a.mobile && ` · ${a.mobile}`}{a.jobTitle && ` · ${a.jobTitle}`}
                          </p>
                          {a.registration && <RegistrationStatusBadge status={a.registration.status} />}
                        </div>
                        {(a.dietaryNeeds || a.accessibilityNeeds) && (
                          <p className="mt-1 text-xs text-ink-muted">{a.dietaryNeeds && `Dietary: ${a.dietaryNeeds}. `}{a.accessibilityNeeds && `Accessibility: ${a.accessibilityNeeds}.`}</p>
                        )}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-primary">Edit / substitute attendee</summary>
                          <AdminForm action={updateAttendeeAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                            <input type="hidden" name="attendeeId" value={a.id} />
                            <input type="hidden" name="orderId" value={order.id} />
                            <Input name="fullName" defaultValue={a.fullName} aria-label="Full name" />
                            <Input name="email" defaultValue={a.email} aria-label="Email" />
                            <Input name="mobile" defaultValue={a.mobile ?? ""} aria-label="Mobile" placeholder="Mobile" />
                            <Input name="jobTitle" defaultValue={a.jobTitle ?? ""} aria-label="Job title" placeholder="Job title" />
                          </AdminForm>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {(isAdmin && ["paid", "partially_refunded"].includes(order.status)) && (
            <Card className="p-6">
              <h2 className="font-sans text-lg font-semibold text-ink">Record a refund</h2>
              <p className="mt-1 text-sm text-ink-muted">Send the refund through GCash/bank first, then record it here.</p>
              {order.refunds.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-ink-muted">
                  {order.refunds.map((r) => <li key={r.id}>{formatDateTime(r.createdAt)}: {formatPHP(r.amountCentavos)} {r.method && `via ${r.method}`} {r.reason && `(${r.reason})`}</li>)}
                </ul>
              )}
              <AdminForm action={refundAction} submitLabel="Record refund" confirm="Record this refund?" className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="orderId" value={order.id} />
                <div><Label htmlFor="ra">Amount (₱)</Label><Input id="ra" name="amount" /></div>
                <div><Label htmlFor="rm">Method</Label><Input id="rm" name="method" placeholder="GCash, BPI…" /></div>
                <div><Label htmlFor="rr">Reference</Label><Input id="rr" name="reference" /></div>
                <div><Label htmlFor="rs">Reason</Label><Input id="rs" name="reason" /></div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox name="cancelSeats" /> Also cancel this order&apos;s seats</label>
              </AdminForm>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-sans text-lg font-semibold text-ink">Summary</h2>
            <div className="mt-4"><PriceSummary pricing={order.pricing} compact /></div>
          </Card>
          <Card className="space-y-1 p-6 text-sm">
            <h2 className="mb-2 font-sans text-lg font-semibold text-ink">Buyer & billing</h2>
            <p className="text-ink">{order.buyerName}</p>
            <p className="text-ink-muted"><a href={`mailto:${order.buyerEmail}`} className="hover:underline">{order.buyerEmail}</a> · {order.buyerMobile}</p>
            {order.billing.company && <p className="text-ink-muted">{order.billing.company}</p>}
            {order.billing.address && <p className="text-ink-muted">{order.billing.address}</p>}
            {order.billing.tin && <p className="text-ink-muted">TIN {order.billing.tin}</p>}
            <p className="pt-2 text-ink-muted">Payment: {order.paymentMethod === "bill_company" ? "Bill my company" : order.paymentChannel?.label}</p>
            {order.referralCode && <p className="text-ink-muted">Referral: {order.referralCode}</p>}
            {Object.keys(order.utm).length > 0 && (
              <p className="text-ink-muted">Source: {[order.utm.source, order.utm.medium, order.utm.campaign].filter(Boolean).join(" / ") || order.utm.referrer}</p>
            )}
            <p className="text-ink-muted">Marketing opt-in: {order.marketingOptIn ? "yes" : "no"}</p>
          </Card>
          <Card className="p-6">
            <AdminForm action={saveOrderNotesAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <div><Label htmlFor="notes">Internal notes</Label><Textarea id="notes" name="adminNotes" defaultValue={order.adminNotes ?? ""} rows={3} /></div>
              <div><Label htmlFor="rcpt">Receipt / invoice no. (optional)</Label><Input id="rcpt" name="receiptNumber" defaultValue={order.receiptNumber ?? ""} /></div>
            </AdminForm>
          </Card>
          {["pending_payment", "awaiting_verification"].includes(order.status) && (
            <Card className="p-6">
              <h2 className="font-sans text-lg font-semibold text-ink">Extend seat hold</h2>
              <AdminForm action={extendDueAction} submitLabel="Extend" className="mt-3 grid gap-3">
                <input type="hidden" name="orderId" value={order.id} />
                <Input type="datetime-local" name="until" defaultValue={toManilaDateTimeLocal(new Date(order.paymentDueAt.getTime() + 2 * 86400000))} aria-label="Hold until" />
              </AdminForm>
            </Card>
          )}
          <Card className="p-6">
            <AdminForm action={resendConfirmationAction} submitLabel="Re-send email to buyer" className="grid gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <p className="text-sm text-ink-muted">Sends the {order.status === "paid" ? "confirmation (with calendar invites)" : "order received / payment instructions"} email again.</p>
            </AdminForm>
          </Card>
          {isAdmin && !["cancelled", "refunded"].includes(order.status) && (
            <Card className="border-danger/30 p-6">
              <h2 className="font-sans text-lg font-semibold text-danger">Cancel order</h2>
              <AdminForm action={cancelOrderAction} submitLabel="Cancel order" confirm="Cancel this order and release its seats?" className="mt-3 grid gap-3">
                <input type="hidden" name="orderId" value={order.id} />
                <Input name="reason" placeholder="Reason" aria-label="Cancellation reason" />
                <label className="flex items-center gap-2 text-sm"><Checkbox name="notify" defaultChecked /> Email the buyer</label>
              </AdminForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
