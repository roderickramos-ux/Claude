import "server-only";
import { eq } from "drizzle-orm";
import type { ReactElement } from "react";
import { db, schema } from "@/db/client";
import { formatDate, formatDateTime } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";
import { formatPHP } from "@/lib/money";
import type { SiteSettings } from "@/lib/settings-schema";
import { absoluteUrl } from "@/lib/utils";
import { scheduleSummary } from "@/components/catalog/schedule";
import { orderUrl } from "../../orders/access";
import { loadOrder, orderSeatCount, type LoadedOrder } from "../../orders/load";
import { getSettings } from "../../settings";
import type { EmailAttachment } from "../providers";
import { Cta, EmailLayout, KeyValue, P, Small } from "./layout";

export type TemplatePayloads = {
  order_received: { orderId: string };
  payment_reminder: { orderId: string };
  order_expired: { orderId: string };
  payment_submitted: { orderId: string };
  payment_confirmed: { orderId: string };
  attendee_confirmed: { orderId: string; attendeeId: string };
  payment_rejected: { orderId: string; reason?: string };
  order_cancelled: { orderId: string; reason?: string };
  admin_new_order: { orderId: string };
  admin_payment_submitted: { orderId: string };
  admin_inquiry: { inquiryId: string };
  subscriber_welcome: { name?: string | null };
};

export type TemplateKey = keyof TemplatePayloads;

export type RenderedTemplate = {
  subject: string;
  element: ReactElement;
  attachments?: EmailAttachment[];
  replyTo?: string;
};

function layoutProps(settings: SiteSettings) {
  return { businessName: settings.businessName, contactEmail: settings.contactEmail || undefined };
}

function OrderSummary({ order }: { order: LoadedOrder }) {
  return (
    <KeyValue
      rows={[
        ["Order number", order.orderNumber],
        ...order.items.map(
          (i) =>
            [
              i.label,
              `${i.seats} ${i.seats === 1 ? "seat" : "seats"} · ${formatPHP(i.lineTotalCentavos)}`,
            ] as [string, string],
        ),
        ...order.pricing.adjustments.map((a) => [a.label, formatPHP(a.amountCentavos)] as [string, string]),
        ["Total", formatPHP(order.totalCentavos)],
      ]}
    />
  );
}

function orderIcs(order: LoadedOrder, settings: SiteSettings): EmailAttachment[] {
  return order.items.map((item, idx) => ({
    filename: order.items.length > 1 ? `praxis-training-${idx + 1}.ics` : "praxis-training.ics",
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    content: buildIcs({
      uidPrefix: `${order.orderNumber}-${item.runId}`,
      title: item.run.course.title,
      description: `${item.run.course.title} (${item.run.code}). Order ${order.orderNumber}. Details: ${orderUrl(order)}`,
      url: absoluteUrl(`/courses/${item.run.course.slug}`),
      sessions: item.run.sessions,
      venue: [item.run.venueName, item.run.venueAddress].filter(Boolean).join(", "),
      organizerEmail: settings.contactEmail || undefined,
    }),
  }));
}

async function withOrder(orderId: string) {
  const [order, settings] = await Promise.all([loadOrder({ id: orderId }), getSettings()]);
  if (!order) throw new Error(`Order ${orderId} not found`);
  return { order, settings, url: orderUrl(order) };
}

const renderers: { [K in TemplateKey]: (p: TemplatePayloads[K]) => Promise<RenderedTemplate> } = {
  async order_received({ orderId }) {
    const { order, settings, url } = await withOrder(orderId);
    const billCompany = order.paymentMethod === "bill_company";
    return {
      subject: `Registration received — ${order.orderNumber}`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview={`We are holding your seats until ${formatDateTime(order.paymentDueAt)}`} heading="Thank you — we have your registration" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>
            We have received your registration and are holding {orderSeatCount(order) === 1 ? "your seat" : "your seats"} until{" "}
            <strong>{formatDateTime(order.paymentDueAt)}</strong>.
            {billCompany
              ? " Your proforma invoice is available on your order page."
              : ` Please pay via ${order.paymentChannel?.label ?? "your chosen channel"} and upload your proof of payment on your order page.`}
          </P>
          <OrderSummary order={order} />
          <Cta href={url}>{billCompany ? "View order & proforma invoice" : "View payment instructions"}</Cta>
          <Small>Seats are confirmed once payment is verified. Unpaid orders are released automatically after the hold period.</Small>
        </EmailLayout>
      ),
    };
  },

  async payment_reminder({ orderId }) {
    const { order, settings, url } = await withOrder(orderId);
    return {
      subject: `Reminder: complete your payment — ${order.orderNumber}`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="Your seats are still on hold" heading="Your seats are still on hold" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>
            We have not yet received proof of payment for order <strong>{order.orderNumber}</strong>. We will hold your seats until{" "}
            <strong>{formatDateTime(order.paymentDueAt)}</strong>.
          </P>
          <OrderSummary order={order} />
          <Cta href={url}>Pay and upload proof</Cta>
          <Small>Already paid? Upload your proof of payment on the order page so we can confirm your seats.</Small>
        </EmailLayout>
      ),
    };
  },

  async order_expired({ orderId }) {
    const { order, settings } = await withOrder(orderId);
    return {
      subject: `Order ${order.orderNumber} has expired`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="Your seat hold has ended" heading="Your seat hold has ended" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>
            We did not receive payment for order <strong>{order.orderNumber}</strong> within the hold period, so the seats have been released.
            You are welcome to register again if seats are still available.
          </P>
          <Cta href={absoluteUrl("/courses")}>See available programs</Cta>
          <Small>If you already paid, please reply to this email with your proof of payment and we will sort it out right away.</Small>
        </EmailLayout>
      ),
    };
  },

  async payment_submitted({ orderId }) {
    const { order, settings, url } = await withOrder(orderId);
    return {
      subject: `We received your proof of payment — ${order.orderNumber}`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="We are verifying your payment" heading="We are verifying your payment" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>Thank you. We received your proof of payment for order <strong>{order.orderNumber}</strong> and will confirm your seats once verified, usually within one business day.</P>
          <Cta href={url}>View order</Cta>
        </EmailLayout>
      ),
    };
  },

  async payment_confirmed({ orderId }) {
    const { order, settings, url } = await withOrder(orderId);
    return {
      subject: `Confirmed: you're registered — ${order.orderNumber}`,
      replyTo: settings.contactEmail || undefined,
      attachments: orderIcs(order, settings),
      element: (
        <EmailLayout preview="Your seats are confirmed" heading="Your seats are confirmed" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>We have verified your payment. Your registration is confirmed. Calendar invites are attached.</P>
          {order.items.map((i) => (
            <KeyValue
              key={i.id}
              rows={[
                ["Program", i.run.course.title],
                ["Schedule", scheduleSummary(i.run.sessions, i.run.startDate, i.run.endDate)],
                ["Format", i.run.format === "hybrid" ? "Hybrid (in person + online)" : i.run.format === "online" ? "Live online" : "In person"],
                ...(i.run.venueName ? ([["Venue", [i.run.venueName, i.run.venueAddress].filter(Boolean).join(", ")]] as [string, string][]) : []),
                ["Attendees", i.attendees.map((a) => a.fullName).join(", ")],
              ]}
            />
          ))}
          <Cta href={url}>View order & acknowledgment</Cta>
          <Small>We will send reminders with the online link and what to prepare before each program.</Small>
        </EmailLayout>
      ),
    };
  },

  async attendee_confirmed({ orderId, attendeeId }) {
    const { order, settings } = await withOrder(orderId);
    const item = order.items.find((i) => i.attendees.some((a) => a.id === attendeeId));
    const attendee = item?.attendees.find((a) => a.id === attendeeId);
    if (!item || !attendee) throw new Error("Attendee not found");
    return {
      subject: `You're registered: ${item.run.course.title}`,
      replyTo: settings.contactEmail || undefined,
      attachments: orderIcs({ ...order, items: [item] }, settings),
      element: (
        <EmailLayout preview={`Your seat in ${item.run.course.title} is confirmed`} heading="Your seat is confirmed" {...layoutProps(settings)}>
          <P>Hi {attendee.fullName.split(" ")[0]},</P>
          <P>
            {order.buyerName}
            {order.billing.company ? ` of ${order.billing.company}` : ""} has registered you for <strong>{item.run.course.title}</strong>. Your seat is confirmed. A calendar invite is attached.
          </P>
          <KeyValue
            rows={[
              ["Schedule", scheduleSummary(item.run.sessions, item.run.startDate, item.run.endDate)],
              ["First day", item.run.sessions[0] ? formatDate(item.run.sessions[0].date) : formatDate(item.run.startDate)],
              ...(item.run.venueName ? ([["Venue", [item.run.venueName, item.run.venueAddress].filter(Boolean).join(", ")]] as [string, string][]) : []),
            ]}
          />
          <Cta href={absoluteUrl(`/courses/${item.run.course.slug}`)}>Program details</Cta>
        </EmailLayout>
      ),
    };
  },

  async payment_rejected({ orderId, reason }) {
    const { order, settings, url } = await withOrder(orderId);
    return {
      subject: `Action needed: payment for ${order.orderNumber}`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="We could not verify your payment" heading="We could not verify your payment" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>We were unable to verify the proof of payment submitted for order <strong>{order.orderNumber}</strong>.</P>
          {reason && <KeyValue rows={[["Reason", reason]]} />}
          <P>Your seats remain on hold until <strong>{formatDateTime(order.paymentDueAt)}</strong>. Please upload a clearer proof or reply to this email.</P>
          <Cta href={url}>Upload proof again</Cta>
        </EmailLayout>
      ),
    };
  },

  async order_cancelled({ orderId, reason }) {
    const { order, settings } = await withOrder(orderId);
    return {
      subject: `Order ${order.orderNumber} cancelled`,
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="Your order has been cancelled" heading="Your order has been cancelled" {...layoutProps(settings)}>
          <P>Hi {order.buyerName.split(" ")[0]},</P>
          <P>Order <strong>{order.orderNumber}</strong> has been cancelled.{reason ? ` Reason: ${reason}.` : ""}</P>
          <Small>If you have questions or believe this is a mistake, just reply to this email.</Small>
        </EmailLayout>
      ),
    };
  },

  async admin_new_order({ orderId }) {
    const { order, settings } = await withOrder(orderId);
    return {
      subject: `[Praxis] New registration ${order.orderNumber} — ${formatPHP(order.totalCentavos)}`,
      replyTo: order.buyerEmail,
      element: (
        <EmailLayout preview={`${order.buyerName} registered ${orderSeatCount(order)} seat(s)`} heading="New registration" {...layoutProps(settings)}>
          <KeyValue
            rows={[
              ["Buyer", `${order.buyerName} <${order.buyerEmail}>`],
              ["Mobile", order.buyerMobile],
              ["Company", order.billing.company || "—"],
              ["Payment", order.paymentMethod === "bill_company" ? "Bill my company" : (order.paymentChannel?.label ?? "—")],
              ["Referral", order.referralCode || "—"],
              ["Hold until", formatDateTime(order.paymentDueAt)],
            ]}
          />
          <OrderSummary order={order} />
          <Cta href={absoluteUrl(`/admin/orders/${order.id}`)}>Open in admin</Cta>
        </EmailLayout>
      ),
    };
  },

  async admin_payment_submitted({ orderId }) {
    const { order, settings } = await withOrder(orderId);
    const last = order.payments.at(-1);
    return {
      subject: `[Praxis] Proof of payment uploaded — ${order.orderNumber}`,
      element: (
        <EmailLayout preview="A payment is waiting for verification" heading="Payment awaiting verification" {...layoutProps(settings)}>
          <KeyValue
            rows={[
              ["Order", order.orderNumber],
              ["Buyer", order.buyerName],
              ["Amount due", formatPHP(order.totalCentavos)],
              ["Amount paid", last ? formatPHP(last.amountCentavos) : "—"],
              ["Reference", last?.referenceNumber || "—"],
              ["Channel", last?.channelCode || "—"],
            ]}
          />
          <Cta href={absoluteUrl(`/admin/orders/${order.id}`)}>Verify payment</Cta>
        </EmailLayout>
      ),
    };
  },

  async admin_inquiry({ inquiryId }) {
    const [inquiry, settings] = await Promise.all([
      db.query.inquiries.findFirst({ where: eq(schema.inquiries.id, inquiryId) }),
      getSettings(),
    ]);
    if (!inquiry) throw new Error("Inquiry not found");
    return {
      subject: `[Praxis] New ${inquiry.type === "corporate" ? "corporate training" : "contact"} inquiry from ${inquiry.name}`,
      replyTo: inquiry.email,
      element: (
        <EmailLayout preview={inquiry.message.slice(0, 90)} heading={inquiry.type === "corporate" ? "Corporate training inquiry" : "New inquiry"} {...layoutProps(settings)}>
          <KeyValue
            rows={[
              ["Name", inquiry.name],
              ["Email", inquiry.email],
              ["Phone", inquiry.phone || "—"],
              ["Company", inquiry.company || "—"],
              ...(inquiry.headcount ? ([["Participants", String(inquiry.headcount)]] as [string, string][]) : []),
            ]}
          />
          <P>{inquiry.message}</P>
          <Small>Reply to this email to respond directly.</Small>
        </EmailLayout>
      ),
    };
  },

  async subscriber_welcome({ name }) {
    const settings = await getSettings();
    return {
      subject: "You're on the list — Praxis Center",
      replyTo: settings.contactEmail || undefined,
      element: (
        <EmailLayout preview="We'll let you know when registration opens" heading="Thank you for your interest" footerNote="You are receiving this because you signed up on praxiscenter.ph." {...layoutProps(settings)}>
          <P>Hi{name ? ` ${name.split(" ")[0]}` : ""},</P>
          <P>
            Thank you for signing up. We will let you know about new programs, schedules and early-bird offers from Praxis Center for Advanced Management.
          </P>
          <Cta href={absoluteUrl("/")}>Visit praxiscenter.ph</Cta>
        </EmailLayout>
      ),
    };
  },
};

export async function renderTemplate<K extends TemplateKey>(key: K, payload: TemplatePayloads[K]) {
  const fn = renderers[key] as (p: TemplatePayloads[K]) => Promise<RenderedTemplate>;
  if (!fn) throw new Error(`Unknown template ${key}`);
  return fn(payload);
}
