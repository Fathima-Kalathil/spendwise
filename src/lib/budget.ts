import Decimal from "decimal.js";
import { D } from "./money";

export type BudgetLevel = "ok" | "warn" | "danger" | "over";

/** How much of a budget is used: percentage, a colour level, and what is left (negative when over). */
export function budgetStatus(spent: Decimal.Value, limit: Decimal.Value) {
  const s = D(spent), l = D(limit);
  const pct = l.gt(0) ? s.div(l).mul(100) : D(0);
  const level: BudgetLevel = pct.gte(100) ? "over" : pct.gte(90) ? "danger" : pct.gte(75) ? "warn" : "ok";
  return { pct: Math.floor(pct.toNumber()), level, remaining: l.minus(s) };
}
