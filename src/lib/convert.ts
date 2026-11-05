import Decimal from "decimal.js";
import { D } from "./money";
import { getRate } from "./fx";

export type ConvertibleTx = {
  amount: string; currency: string; date: string;
  rateToBase: string | null; baseCurrency: string | null;
};

/**
 * Converts transactions into the user's CURRENT base currency.
 *  - same currency             -> amount as is
 *  - rate stored for this base -> historical value (rate at entry time)
 *  - otherwise                 -> look up the rate for the transaction date (cached)
 * Returns null when no rate exists, so callers can show "missing rate" instead of wrong numbers.
 */
export function createConverter(base: string) {
  const memo = new Map<string, Promise<string | null>>();
  return async (t: ConvertibleTx): Promise<Decimal | null> => {
    if (t.currency === base) return D(t.amount);
    if (t.baseCurrency === base && t.rateToBase) return D(t.amount).mul(t.rateToBase);
    const key = `${t.currency}:${t.date}`;
    if (!memo.has(key)) memo.set(key, getRate(t.currency, base, t.date).then((r) => r?.rate ?? null));
    const rate = await memo.get(key)!;
    return rate ? D(t.amount).mul(rate) : null;
  };
}
