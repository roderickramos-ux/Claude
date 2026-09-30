/* eslint-disable @next/next/no-img-element */
import { CheckCircle2, Clock, FileText, Hourglass, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProofForm } from "@/components/checkout/proof-form";
import { PriceSummary } from "@/components/checkout/price-summary";
import { scheduleSummary } from "@/components/catalog/schedule";
import { Markdown } from "@/components/markdown";
import { Alert, Badge, Card, Container } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { centavosToPesosInput, formatPHP } from "@/lib/money";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import { verifyOrderAccessToken } from "@/server/orders/access";
import { loadOrder, ORDER_STATUS_LABEL } from "@/server/orders/load";
import { listActivePaymentChannels } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";
import { publicFileUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const statusTone = {
  pending_payment: "warning",
  awaiting_verification: "primary",
  paid: "success",
  cancelled: "danger",
  expired: "danger",
  refunded: "neutral",
  partially_refunded: "neutral",
} as const;

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[number]">) {
  const { number } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const order = await loadOrder({ orderNumber: number });
  if (!order) notFound();
  const user = await getCurrentUser();
  const allowed = verifyOrderAccessToken(order.id, token) || hasRole(user, "staff") || (user && user.email === order.buyerEmail);
  if (!allowed) notFound();

  const [channels, settings] = await Promise.all([listActivePaymentChannels(), getSettings()]);
  const unpaid = order.status === "pending_payment" || order.status === "awaiting_verification";
  const verified = order.payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amountCentavos, 0);
  const balance = Math.max(0, order.totalCentavos - verified);
  const docLabel = order.paymentMethod === "bill_company" && unpaid ? "Proforma invoice (PDF)" : "Order acknowledgment (PDF)";
  const docHref = `/orders/${order.orderNumber}/document?t=${token}`;
  const preferred = order.paymentChannel?.code;
  const orderedChannels = [...channels].sort((a, b) => (a.code === preferred ? -1 : b.code === preferred ? 1 : 0));

  return (
    <Container className="py-12">
      {sp.new === "1" && (
        <Alert tone="success" className="mb-8">
          <strong>Thank you! Your order has been placed.</strong> We&apos;ve emailed a copy to {order.buyerEmail}. Bookmark this page. You can
          return to it anytime from the link in your email.
        </Alert>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">Order</p>
          <h1 className="text-4xl text-ink">{order.orderNumber}</h1>
        </div>
        <Badge tone={statusTone[order.status]} className="self-start px-3 py-1 text-sm sm:self-auto">
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          {order.status === "pending_payment" && (
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <Clock className="mt-1 size-6 shrink-0 text-warning" aria-hidden />
                <div>
                  <h2 className="text-2xl text-ink">Complete your payment</h2>
                  <p className="mt-1 text-ink-muted">
                    Please pay <strong className="text-ink">{formatPHP(balance)}</strong> by{" "}
                    <strong className="text-ink">{formatDateTime(order.paymentDueAt)}</strong> to keep your seats. Use{" "}
                    <strong className="text-ink">{order.orderNumber}</strong> as the reference or message.
                  </p>
                </div>
              </div>
              {order.paymentMethod === "bill_company" && (
                <div className="mt-6 rounded-lg bg-muted p-5">
                  <Markdown className="text-base">{settings.billCompanyInstructions}</Markdown>
                  <a href={docHref} className="mt-3 inline-flex items-center gap-2 font-medium text-primary hover:underline">
                    <FileText className="size-4" aria-hidden /> Download proforma invoice
                  </a>
                </div>
              )}
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {orderedChannels.map((c) => {
                  const qr = publicFileUrl(c.qrImagePath);
                  return (
                    <div key={c.id} className={`rounded-xl border p-5 ${c.code === preferred ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                      <h3 className="font-sans text-lg font-semibold text-ink">{c.label}</h3>
                      {qr ? (
                        <img src={qr} alt={`${c.label} QR code`} className="mx-auto mt-4 aspect-square w-full max-w-60 rounded-lg border border-border bg-white object-contain p-2" />
                      ) : (
                        <p className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs text-ink-muted">QR code coming soon</p>
                      )}
                      <dl className="mt-4 space-y-1 text-sm">
                        {c.accountName && (<div><dt className="inline text-ink-muted">Account name: </dt><dd className="inline font-medium text-ink">{c.accountName}</dd></div>)}
                        {c.accountNumber && (<div><dt className="inline text-ink-muted">Account no.: </dt><dd className="inline font-mono font-medium text-ink">{c.accountNumber}</dd></div>)}
                      </dl>
                      {c.instructions && <Markdown className="mt-3 text-sm text-ink-muted">{c.instructions}</Markdown>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {order.status === "awaiting_verification" && (
            <Alert tone="info" className="flex items-start gap-3">
              <Hourglass className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>We received your proof of payment and are verifying it, usually within one business day. We&apos;ll email you once your seats are confirmed.</span>
            </Alert>
          )}
          {order.status === "paid" && (
            <Alert tone="success" className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>Payment verified. Your seats are confirmed. Calendar invites were sent by email.</span>
            </Alert>
          )}
          {(order.status === "expired" || order.status === "cancelled") && (
            <Alert tone="danger" className="flex items-start gap-3">
              <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                This order is {order.status}. {order.status === "expired" ? "The seat hold ended before payment was received." : order.cancelReason}
                {settings.contactEmail && <> If you have already paid, please email <a className="underline" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>.</>}
              </span>
            </Alert>
          )}

          {unpaid && (
            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl text-ink">{order.status === "awaiting_verification" ? "Upload another proof" : "Upload proof of payment"}</h2>
              <p className="mt-1 mb-6 text-sm text-ink-muted">After paying, upload a screenshot of your receipt so we can confirm your seats.</p>
              <ProofForm
                orderNumber={order.orderNumber}
                token={token}
                channels={channels.map((c) => ({ code: c.code, label: c.label }))}
                defaultChannel={preferred}
                defaultAmount={centavosToPesosInput(balance)}
              />
            </Card>
          )}

          <Card className="p-6 sm:p-8">
            <h2 className="text-2xl text-ink">Registration details</h2>
            <div className="mt-5 space-y-6">
              {order.items.map((item) => (
                <div key={item.id}>
                  <h3 className="font-sans font-semibold text-ink">{item.run.course.title}</h3>
                  <p className="text-sm text-ink-muted">Batch {item.run.code} · {scheduleSummary(item.run.sessions, item.run.startDate, item.run.endDate)}</p>
                  <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
                    {item.attendees.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <span className="text-ink">{a.fullName} <span className="text-ink-muted">· {a.email}</span></span>
                        <Badge tone={a.registration?.status === "confirmed" ? "success" : a.registration?.status === "cancelled" ? "danger" : "warning"}>
                          {a.registration?.status.replace("_", " ") ?? "—"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-2xl text-ink">Summary</h2>
            <div className="mt-5"><PriceSummary pricing={order.pricing} compact /></div>
            {verified > 0 && (
              <p className="mt-3 flex justify-between text-sm"><span className="text-ink-muted">Paid</span><span className="text-success">{formatPHP(verified)}</span></p>
            )}
            <a href={docHref} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <FileText className="size-4" aria-hidden /> {docLabel}
            </a>
          </Card>
          <Card className="p-6 text-sm text-ink-muted">
            <p><span className="text-ink">Buyer:</span> {order.buyerName}</p>
            {order.billing.company && <p><span className="text-ink">Company:</span> {order.billing.company}</p>}
            <p><span className="text-ink">Placed:</span> {formatDateTime(order.createdAt)}</p>
            {order.referralCode && <p><span className="text-ink">Referral:</span> {order.referralCode}</p>}
          </Card>
        </aside>
      </div>
    </Container>
  );
}
