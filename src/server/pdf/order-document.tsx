import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { SiteSettings } from "@/lib/settings-schema";
import type { LoadedOrder } from "../orders/load";

// Built-in PDF fonts have no peso sign, so amounts are printed as "PHP 12,500.00".
const php = (c: number) => `PHP ${(c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const navy = "#1b3f7a";
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937", lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: navy, paddingBottom: 12 },
  brand: { fontSize: 20, fontFamily: "Times-Bold", color: navy, letterSpacing: 3 },
  sub: { fontSize: 8, color: "#6b7280", letterSpacing: 1 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: navy, textAlign: "right" },
  muted: { color: "#6b7280" },
  section: { marginTop: 18 },
  h: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 6 },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: "#f3f4f6" },
  c1: { flex: 5, paddingHorizontal: 4 },
  c2: { flex: 1, textAlign: "right", paddingHorizontal: 4 },
  c3: { flex: 2, textAlign: "right", paddingHorizontal: 4 },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  notice: { marginTop: 24, padding: 10, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#f9fafb", fontSize: 8.5 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

export type OrderDocumentKind = "acknowledgment" | "proforma";

function OrderDocument({ order, settings, kind }: { order: LoadedOrder; settings: SiteSettings; kind: OrderDocumentKind }) {
  const verified = order.payments.filter((p) => p.status === "verified").reduce((a, p) => a + p.amountCentavos, 0);
  return (
    <Document title={`${order.orderNumber} ${kind}`} author={settings.businessName}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>PRAXIS</Text>
            <Text style={s.sub}>CENTER FOR ADVANCED MANAGEMENT</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>{settings.businessName}</Text>
            {settings.address ? <Text style={s.muted}>{settings.address}</Text> : null}
            {settings.businessTin ? <Text style={s.muted}>TIN: {settings.businessTin}</Text> : null}
            {settings.taxNote ? <Text style={s.muted}>{settings.taxNote}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>{kind === "proforma" ? "PROFORMA INVOICE" : "ORDER ACKNOWLEDGMENT"}</Text>
            <Text style={{ textAlign: "right", marginTop: 6 }}>No. {order.orderNumber}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Date: {formatDate(order.createdAt)}</Text>
            {order.receiptNumber ? <Text style={[s.muted, { textAlign: "right" }]}>Ref: {order.receiptNumber}</Text> : null}
          </View>
        </View>

        <View style={[s.section, { flexDirection: "row", gap: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.h}>Billed to</Text>
            <Text>{order.billing.name}</Text>
            {order.billing.company ? <Text>{order.billing.company}</Text> : null}
            {order.billing.address ? <Text style={s.muted}>{order.billing.address}</Text> : null}
            {order.billing.tin ? <Text style={s.muted}>TIN: {order.billing.tin}</Text> : null}
            <Text style={s.muted}>{order.buyerEmail} · {order.buyerMobile}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h}>Status</Text>
            <Text>{order.status === "paid" ? `Paid ${order.paidAt ? formatDate(order.paidAt) : ""}` : kind === "proforma" ? `Payment due by ${formatDateTime(order.paymentDueAt)}` : order.status.replace(/_/g, " ")}</Text>
            {order.paymentChannel ? <Text style={s.muted}>Payment channel: {order.paymentChannel.label}</Text> : null}
          </View>
        </View>

        <View style={s.section}>
          <View style={[s.row, s.th]}>
            <Text style={s.c1}>Description</Text>
            <Text style={s.c2}>Seats</Text>
            <Text style={s.c3}>Unit price</Text>
            <Text style={s.c3}>Amount</Text>
          </View>
          {order.items.map((i) => (
            <View key={i.id} style={s.row} wrap={false}>
              <View style={s.c1}>
                <Text>{i.label}</Text>
                <Text style={s.muted}>
                  {i.run.sessions.map((x) => formatDate(x.date)).join(", ")}
                </Text>
                <Text style={s.muted}>Attendees: {i.attendees.map((a) => a.fullName).join(", ")}</Text>
                {i.priceBasis !== "regular" ? <Text style={s.muted}>Rate: {i.priceBasis.replace("_", "-").replace("+", " + ")} (regular {php(i.regularUnitCentavos)})</Text> : null}
              </View>
              <Text style={s.c2}>{i.seats}</Text>
              <Text style={s.c3}>{php(i.unitPriceCentavos)}</Text>
              <Text style={s.c3}>{php(i.lineTotalCentavos)}</Text>
            </View>
          ))}
          {order.pricing.adjustments.map((a) => (
            <View key={a.label} style={s.row}>
              <Text style={s.c1}>{a.label}</Text>
              <Text style={s.c2} />
              <Text style={s.c3} />
              <Text style={s.c3}>{php(a.amountCentavos)}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>Total: {php(order.totalCentavos)}</Text>
          </View>
          {verified > 0 && (
            <View style={s.total}>
              <Text>Payments received: {php(verified)} · Balance: {php(Math.max(0, order.totalCentavos - verified))}</Text>
            </View>
          )}
        </View>

        <View style={s.notice}>
          <Text>
            {kind === "proforma"
              ? "This proforma invoice is issued for payment processing purposes only. It is not an official receipt or sales invoice."
              : "This document acknowledges your registration and payment status. It is not a BIR official receipt or sales invoice."}{" "}
            Please quote order number {order.orderNumber} in all payments and correspondence.
          </Text>
        </View>

        <Text style={s.footer} fixed>
          {settings.businessName}
          {settings.contactEmail ? ` · ${settings.contactEmail}` : ""}
          {settings.contactPhone ? ` · ${settings.contactPhone}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderOrderDocument(order: LoadedOrder, settings: SiteSettings, kind: OrderDocumentKind) {
  return renderToBuffer(<OrderDocument order={order} settings={settings} kind={kind} />);
}
