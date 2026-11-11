import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions, type TxFilters } from "@/lib/queries";
import { createConverter } from "@/lib/convert";
import { toCsv } from "@/lib/csv";
import { D } from "@/lib/money";
import { iso } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** CSV download. ?month=2026-11 for one month, or the same filters as the History page. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please log in first.", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const base = user.baseCurrency.trim();

  const filters: TxFilters = {
    q: sp.get("q") ?? undefined, type: sp.get("type") ?? undefined, categoryId: sp.get("category") ?? undefined,
    currency: sp.get("currency") ?? undefined, accountId: sp.get("account") ?? undefined,
    from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined, min: sp.get("min") ?? undefined, max: sp.get("max") ?? undefined,
  };
  const month = sp.get("month");
  let name = "spendwise-all";
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    filters.from = `${month}-01`; filters.to = iso(new Date(y, m, 0)); name = `spendwise-${month}`;
  } else if (filters.from || filters.to) name = `spendwise-${filters.from ?? "start"}-to-${filters.to ?? "today"}`;

  const rows = await getTransactions(user.id, filters, 20000);
  const convert = createConverter(base);
  const out: (string | number)[][] = [["Date", "Type", "Category", "Description", "Amount", "Currency", "Exchange rate", "Main currency", `Amount in ${base}`, "Wallet", "Payment method", "Notes"]];
  for (const r of rows) {
    const v = await convert(r);
    out.push([r.date, r.type === "income" ? "Income" : "Expense", r.categoryName ?? "", r.description, D(r.amount).toFixed(2), r.currency,
      r.rateToBase ? D(r.rateToBase).toString() : "", base, v ? v.toDecimalPlaces(2).toFixed(2) : "", r.accountName, r.paymentMethod, r.notes]);
  }
  return new NextResponse(toCsv(out), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "no-store" },
  });
}
