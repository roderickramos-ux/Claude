import { Badge } from "@/components/ui/misc";

const orderTone = {
  pending_payment: "warning",
  awaiting_verification: "primary",
  paid: "success",
  cancelled: "danger",
  expired: "neutral",
  refunded: "neutral",
  partially_refunded: "neutral",
} as const;

export function OrderStatusBadge({ status }: { status: keyof typeof orderTone }) {
  return <Badge tone={orderTone[status]}>{status.replace(/_/g, " ")}</Badge>;
}

const regTone = { pending_payment: "warning", confirmed: "success", cancelled: "danger", waitlisted: "neutral", attended: "primary", completed: "primary" } as const;

export function RegistrationStatusBadge({ status }: { status: keyof typeof regTone }) {
  return <Badge tone={regTone[status]}>{status.replace(/_/g, " ")}</Badge>;
}
