import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const D = (v: Decimal.Value | null | undefined) => new Decimal(v ?? 0);

/** Convert an amount using a rate (1 unit of source = `rate` units of target). Rounded to `dp` places. */
export function convertAmount(amount: Decimal.Value, rate: Decimal.Value, dp = 4): Decimal {
  return D(amount).mul(D(rate)).toDecimalPlaces(dp);
}

export function sumDecimals(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), D(0));
}

export function isValidAmount(v: string): boolean {
  return /^\d+(\.\d{1,4})?$/.test(v) && D(v).gt(0);
}

export function isValidRate(v: string): boolean {
  return /^\d+(\.\d{1,8})?$/.test(v) && D(v).gt(0);
}
