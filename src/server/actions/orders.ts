"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { pesosToCentavos } from "@/lib/money";
import { fieldErrors, paymentProofSchema } from "@/lib/validation/checkout";
import { flushOutboxAfterResponse } from "../notifications/flush";
import { verifyOrderAccessToken } from "../orders/access";
import { OrderActionError, submitPaymentProof } from "../orders/lifecycle";
import { rateLimit } from "../ratelimit";
import { UploadError, uploadFile, validateUpload } from "../storage";

export type ProofState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

export async function uploadPaymentProof(_: ProofState, formData: FormData): Promise<ProofState> {
  const rl = await rateLimit("proof", 10, 3600);
  if (!rl.ok) return { message: "Too many uploads. Please try again later." };

  const orderNumber = String(formData.get("orderNumber") ?? "");
  const token = String(formData.get("t") ?? "");
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, orderNumber) });
  if (!order || !verifyOrderAccessToken(order.id, token)) return { message: "This link is invalid. Please use the link from your email." };

  const parsed = paymentProofSchema.safeParse({
    channelCode: formData.get("channelCode"),
    amount: formData.get("amount"),
    referenceNumber: formData.get("referenceNumber"),
    payerName: formData.get("payerName") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const file = formData.get("proof");
  try {
    if (!(file instanceof File)) throw new UploadError("Please attach a screenshot or PDF of your payment.");
    validateUpload(file, { images: true, pdf: true });
    const proofPath = await uploadFile("private", `proofs/${order.id}`, file);
    await submitPaymentProof(order.id, {
      channelCode: parsed.data.channelCode,
      amountCentavos: pesosToCentavos(parsed.data.amount),
      referenceNumber: parsed.data.referenceNumber,
      payerName: parsed.data.payerName,
      proofPath,
    });
  } catch (e) {
    if (e instanceof UploadError || e instanceof OrderActionError) return { errors: { proof: e.message }, message: e.message };
    console.error("[proof] upload failed", e);
    return { message: "Upload failed. Please try again or email your proof of payment to us." };
  }
  flushOutboxAfterResponse();
  revalidatePath(`/orders/${orderNumber}`);
  return { ok: true, message: "Thank you! We received your proof of payment and will confirm your seats shortly." };
}
