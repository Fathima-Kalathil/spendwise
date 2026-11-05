import Decimal from "decimal.js";
import { D } from "./money";

/** Balance of one account, in the account's own currency. Pure function -> easy to unit test. */
export function accountBalance(p: {
  opening: Decimal.Value; income: Decimal.Value; expense: Decimal.Value;
  transfersIn: Decimal.Value; transfersOut: Decimal.Value;
}): Decimal {
  return D(p.opening).plus(D(p.income)).minus(D(p.expense)).plus(D(p.transfersIn)).minus(D(p.transfersOut));
}
