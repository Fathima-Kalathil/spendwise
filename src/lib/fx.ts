import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { todayIso } from "./dates";

export type RateResult = { rate: string; source: string };

/** Pull `to` out of a currency-api style response: { date, usd: { inr: 83.5, ... } } */
export function parseCurrencyApi(json: unknown, from: string, to: string): string | null {
  const table = (json as Record<string, Record<string, number>> | null)?.[from.toLowerCase()];
  const v = table?.[to.toLowerCase()];
  return typeof v === "number" && v > 0 ? String(v) : null;
}

/** Parse open.er-api.com style response: { result: "success", rates: { INR: 83.5 } } */
export function parseErApi(json: unknown, to: string): string | null {
  const v = (json as { rates?: Record<string, number> } | null)?.rates?.[to.toUpperCase()];
  return typeof v === "number" && v > 0 ? String(v) : null;
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Rate for 1 `from` in `to` on `date`. Order: same currency -> DB cache -> free APIs -> null.
 * null means "ask the user for a manual rate" (we never guess).
 */
export async function getRate(from: string, to: string, date: string): Promise<RateResult | null> {
  if (from === to) return { rate: "1", source: "same currency" };
  const today = todayIso();
  const day = date > today ? today : date;

  const cached = await db.select().from(exchangeRates)
    .where(and(eq(exchangeRates.base, from), eq(exchangeRates.quote, to), eq(exchangeRates.rateDate, day))).limit(1);
  if (cached[0]) return { rate: cached[0].rate, source: `cached (${cached[0].source})` };

  const version = day === today ? "latest" : day;
  const f = from.toLowerCase();
  const attempts: [string, () => Promise<string | null>][] = [
    ["currency-api", async () => parseCurrencyApi(await getJson(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${f}.json`), from, to)],
    ["currency-api (backup)", async () => parseCurrencyApi(await getJson(`https://${version}.currency-api.pages.dev/v1/currencies/${f}.json`), from, to)],
  ];
  if (day === today) {
    attempts.push(["open.er-api", async () => parseErApi(await getJson(`https://open.er-api.com/v6/latest/${from}`), to)]);
  }

  for (const [source, run] of attempts) {
    const rate = await run();
    if (rate) {
      await db.insert(exchangeRates).values({ base: from, quote: to, rate, rateDate: day, source }).onConflictDoNothing();
      return { rate, source };
    }
  }
  return null;
}
