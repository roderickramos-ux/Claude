import { getCurrentUser, hasRole } from "@/server/auth/session";
import { verifyOrderAccessToken } from "@/server/orders/access";
import { loadOrder } from "@/server/orders/load";
import { renderOrderDocument } from "@/server/pdf/order-document";
import { getSettings } from "@/server/settings";

export async function GET(request: Request, ctx: RouteContext<"/orders/[number]/document">) {
  const { number } = await ctx.params;
  const token = new URL(request.url).searchParams.get("t");
  const order = await loadOrder({ orderNumber: number });
  if (!order) return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!verifyOrderAccessToken(order.id, token) && !hasRole(user, "staff")) return new Response("Not found", { status: 404 });

  const unpaid = order.status === "pending_payment" || order.status === "awaiting_verification";
  const kind = order.paymentMethod === "bill_company" && unpaid ? "proforma" : "acknowledgment";
  const pdf = await renderOrderDocument(order, await getSettings(), kind);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.orderNumber}-${kind}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
