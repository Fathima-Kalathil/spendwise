import Link from "next/link";
import Decimal from "decimal.js";
import { requireUser } from "@/lib/auth";
import { getBudgets, getCategories, getTransactions } from "@/lib/queries";
import { createConverter } from "@/lib/convert";
import { D } from "@/lib/money";
import { formatMoney } from "@/lib/format";
import { iso, lastMonths } from "@/lib/dates";
import { Stat } from "@/components/ui";
import { CategoryDonut } from "@/components/Charts";
import { TxTable } from "@/components/TxTable";
import { AddButton } from "@/components/AddButton";
import { BudgetCard, type CatBar } from "@/components/BudgetCard";

const LIST_LIMIT = 8;

export default async function MonthPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const base = user.baseCurrency.trim();
  const convert = createConverter(base);

  // Which month are we looking at? ?month=2026-11 (defaults to the current month)
  const thisMonth = iso(new Date()).slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth;
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`, to = iso(new Date(y, m, 0));
  const prev = iso(new Date(y, m - 2, 1)).slice(0, 7), next = iso(new Date(y, m, 1)).slice(0, 7);
  const title = new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const months = lastMonths(12);
  const [rows, twelve, budgets, cats] = await Promise.all([
    getTransactions(user.id, { from, to }, 5000),
    getTransactions(user.id, { from: months[0].from, to: months[11].to }, 20000),
    getBudgets(user.id),
    getCategories(user.id),
  ]);

  // Totals for the selected month (everything converted into the main currency)
  let income = D(0), expense = D(0), missing = 0;
  const byCat = new Map<string, { name: string; value: Decimal; color: string }>();
  for (const t of rows) {
    const v = await convert(t);
    if (!v) { missing++; continue; }
    if (t.type === "income") income = income.plus(v);
    else {
      expense = expense.plus(v);
      const k = t.categoryId ?? "none";
      const cur = byCat.get(k) ?? { name: t.categoryName ?? "No category", value: D(0), color: t.categoryColor ?? "#9CA3AF" };
      byCat.set(k, { ...cur, value: cur.value.plus(v) });
    }
  }
  const left = income.minus(expense);
  const donut = [...byCat.values()].map((v) => ({ name: v.name, value: v.value.toDecimalPlaces(2).toNumber(), color: v.color })).sort((a, b) => b.value - a.value);

  // Budget: overall monthly limit + optional per-category limits
  const overall = budgets.find((b) => b.categoryId === null);
  const catBars = budgets.flatMap((b): CatBar[] => {
    const c = b.categoryId ? cats.find((x) => x.id === b.categoryId) : undefined;
    return c ? [{ name: c.name, color: c.color, spent: byCat.get(c.id)?.value ?? D(0), limit: D(b.amount) }] : [];
  });

  // Month by month table (last 12 months)
  const table = months.map((mo) => ({ ...mo, key: mo.from.slice(0, 7), income: D(0), expense: D(0) }));
  for (const t of twelve) {
    const row = table.find((r) => t.date >= r.from && t.date <= r.to);
    const v = await convert(t);
    if (!row || !v) continue;
    if (t.type === "income") row.income = row.income.plus(v); else row.expense = row.expense.plus(v);
  }

  const expenses = rows.filter((r) => r.type === "expense"), incomes = rows.filter((r) => r.type === "income");
  const otherCurrency = rows.some((r) => r.currency !== base);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard?month=${prev}`} className="btn !px-3" aria-label="Previous month">‹</Link>
          <h1 className="min-w-[10rem] text-center text-xl font-bold md:text-2xl">{title}</h1>
          <Link href={`/dashboard?month=${next}`} className="btn !px-3" aria-label="Next month">›</Link>
        </div>
        <div className="flex items-center gap-2">{month !== thisMonth && <Link href="/dashboard" className="chip">Back to this month</Link>}<a href={`/api/export?month=${month}`} className="btn">Download CSV</a></div>
      </div>

      {twelve.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div><div className="font-semibold">Welcome! Let’s add your first one.</div>
            <div className="muted text-sm">Add what you earned and what you spent. This page then shows the total for each month.</div></div>
          <div className="flex gap-2"><AddButton label="+ Money out" type="expense" /><AddButton label="+ Money in" type="income" /></div>
        </div>
      )}
      {missing > 0 && <p role="status" className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">{missing} item(s) are not counted because the exchange rate is missing. Tap Edit on them and type the rate.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Income this month" value={formatMoney(income, base)} tone="pos" />
        <Stat label="Expenses this month" value={formatMoney(expense, base)} tone="neg" />
        <Stat label={left.gte(0) ? "Left over" : "Overspent by"} value={formatMoney(left.abs(), base)} tone={left.gte(0) ? "pos" : "neg"} />
      </div>
      {otherCurrency && <p className="muted -mt-3 text-xs">Amounts in other currencies are converted to {base} so they can be added together.</p>}
      <BudgetCard base={base} spent={expense} limit={overall ? D(overall.amount) : null} cats={catBars} />

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card">
          <div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-semibold">Expenses <span className="neg">· {formatMoney(expense, base)}</span></h2><AddButton label="+ Add expense" type="expense" /></div>
          <TxTable rows={expenses.slice(0, LIST_LIMIT)} base={base} short empty="No expenses added for this month yet." />
          {expenses.length > LIST_LIMIT && <Link href={`/transactions?type=expense&from=${from}&to=${to}`} className="btn mt-3 w-full">See all {expenses.length} expenses →</Link>}
        </section>
        <section className="card">
          <div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-semibold">Income <span className="pos">· {formatMoney(income, base)}</span></h2><AddButton label="+ Add income" type="income" /></div>
          <TxTable rows={incomes.slice(0, LIST_LIMIT)} base={base} short empty="No income added for this month yet." />
          {incomes.length > LIST_LIMIT && <Link href={`/transactions?type=income&from=${from}&to=${to}`} className="btn mt-3 w-full">See all {incomes.length} income items →</Link>}
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card"><h2 className="mb-2 font-semibold">Where the money went</h2>
          {donut.length ? <CategoryDonut data={donut} currency={base} /> : <p className="muted py-8 text-center text-sm">No expenses in this month yet.</p>}</section>
        <section className="card"><h2 className="mb-2 font-semibold">Month by month</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[360px]">
            <thead><tr><th className="th">Month</th><th className="th text-right">Income</th><th className="th text-right">Expenses</th><th className="th text-right">Left</th></tr></thead>
            <tbody>{[...table].reverse().map((r) => {
              const l = r.income.minus(r.expense);
              return (
                <tr key={r.key} style={r.key === month ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)" } : undefined}>
                  <td className="td font-medium"><Link href={`/dashboard?month=${r.key}`} className="underline" style={{ color: "var(--accent)" }}>{new Date(r.from + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</Link></td>
                  <td className="td pos text-right">{formatMoney(r.income, base)}</td>
                  <td className="td neg text-right">{formatMoney(r.expense, base)}</td>
                  <td className={`td text-right font-semibold ${l.gte(0) ? "pos" : "neg"}`}>{formatMoney(l, base)}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </section>
      </div>
    </div>
  );
}
