"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { uploadPaymentProof, type ProofState } from "@/server/actions/orders";

export function ProofForm({
  orderNumber,
  token,
  channels,
  defaultChannel,
  defaultAmount,
}: {
  orderNumber: string;
  token: string;
  channels: { code: string; label: string }[];
  defaultChannel?: string;
  defaultAmount: string;
}) {
  const [state, action, pending] = useActionState<ProofState, FormData>(uploadPaymentProof, undefined);
  const e = state?.errors ?? {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" encType="multipart/form-data">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      <Field label="Paid via" name="channelCode" error={e.channelCode} required>
        <Select name="channelCode" defaultValue={defaultChannel}>
          {channels.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </Select>
      </Field>
      <Field label="Amount paid (₱)" name="amount" error={e.amount} required>
        <Input name="amount" inputMode="decimal" defaultValue={defaultAmount} />
      </Field>
      <Field label="Reference number" name="referenceNumber" error={e.referenceNumber} required hint="From your GCash/bank receipt">
        <Input name="referenceNumber" />
      </Field>
      <Field label="Name of payer" name="payerName" hint="If different from the buyer">
        <Input name="payerName" />
      </Field>
      <Field label="Screenshot or PDF of payment" name="proof" error={e.proof} required className="sm:col-span-2" hint="JPG, PNG, WebP or PDF, max 4 MB">
        <Input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="h-auto py-2" required />
      </Field>
      {state?.message && !state.ok && !e.proof && <Alert tone="danger" className="sm:col-span-2">{state.message}</Alert>}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Uploading…" : "Submit proof of payment"}</Button>
      </div>
    </form>
  );
}
