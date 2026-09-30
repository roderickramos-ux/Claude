const whole = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

/** Formats integer centavos as pesos, e.g. 1250000 → "₱12,500"; shows centavos only when present. */
export function formatPHP(centavos: number): string {
  return centavos % 100 === 0 ? whole.format(centavos / 100) : withCents.format(centavos / 100);
}

/** Parses a peso amount typed by an admin ("12,500" or "12500.50") into centavos. */
export function pesosToCentavos(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[₱,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export function centavosToPesosInput(centavos: number): string {
  return (centavos / 100).toFixed(centavos % 100 === 0 ? 0 : 2);
}
