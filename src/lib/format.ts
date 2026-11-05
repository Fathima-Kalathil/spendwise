import Decimal from "decimal.js";

const LOCALES: Record<string, string> = { INR: "en-IN", AED: "en-AE", SAR: "en-SA", GBP: "en-GB", EUR: "de-DE" };

/** Proper number formatting per currency, e.g. ₹50,000.00 or AED 500.00 */
export function formatMoney(value: Decimal.Value | null | undefined, currency: string): string {
  const n = new Decimal(value ?? 0).toNumber(); // display only, never used for calculations
  try {
    return new Intl.NumberFormat(LOCALES[currency] ?? "en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
