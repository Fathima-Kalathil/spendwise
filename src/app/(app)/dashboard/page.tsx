import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccountsWithBalances, getTransactions } from "@/lib/queries";
import { createConverter } from "@/lib/convert";
import { getRate } from "@/lib/fx";
import { D } from "@/lib/money";
import { formatMoney } from "@/lib/format";
import { RANGES, lastMonths, resolveRange, todayIso } from "@/lib/dates";
import { CurrencyTile, Stat } from "@/components/ui";
import { CategoryDonut, IncomeExpenseChart } from "@/components/Charts";
import { TxTable } from "@/components/TxTable";
import Decimal from "decimal.js";

export default async function Dashboard({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const base = user.baseCurrency.trim();
  const range = resolveRange(searchParams.range, searchParams.from, searchParams.to);
  const convert = createConverter(base);
  const months = lastMonths(6);

  const [accounts, inRange, sixMonths, recent] = await Promise.all([
    getAccountsWithBalances(user.id),
    getTransactions(user.id, { from: range.from, to: range.to }, 5000),
    getTransactions(user.id, { from: months[0].from, to: months[5].to }, 10000),
    getTransactions(user.id, {}, 5),
  ]);

  // Period totals + category breakdown (converted into the base currency)
  let income = D(0), expense = D(0), missing = 0;
  const byCat = new Map<string, { value: Decimal; color: string }>();
  for (const t of inRange) {
    const v = await convert(t);
    if (!v) { missing++; continue; }
    if (t.type === "income") income = income.plus(v);
    else {
      expense = expense.plus(v);
      const k = t.categoryName ?? "No category";
      const cur = byCat.get(k) ?? { value: D(0), color: t.categoryColor ?? "#9CA3AF" };
      byCat.set(k, { ...cur, value: cur.value.plus(v) });
    }
  }
  const donut = [...byCat].map(([name, v]) => ({ name, value: v.value.toDecimalPlaces(2).toNumber(), color: v.color })).sort((a, b) => b.value - a.value);

  // Last 6 months chart
  const series = months.map((m) => ({ label: m.label, from: m.from, to: m.to, income: D(0), expense: D(0) }));
  for (const t of sixMonths) {
    const bucket = series.find((m) => t.date >= m.from && t.date <= m.to);
    const v = await convert(t);
    if (!bucket || !v) continue;
    if (t.type === "income") bucket.income = bucket.income.plus(v); else bucket.expense = bucket.expense.plus(v);
  }

  // Balances per currency (never mixed) + optional total at TODAY's rates
  const perCurrency = new Map<string, Decimal>();
  for (const a of accounts) perCurrency.set(a.currency, (perCurrency.get(a.currency) ?? D(0)).plus(a.balance));
  let total = D(0), totalMissing = false;
  for (const [cur, bal] of perCurrency) {
    const r = cur === base ? { rate: "1" } : await getRate(cur, base, todayIso());
    if (!r) { totalMissing = true; continue; }
    total = total.plus(bal.mul(r.rate));
  }

  const range_ = (k: string) => `/dashboard?range=${k}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
          {RANGES.filter((r) => r.key !== "custom").map((r) => <Link key={r.key} href={range_(r.key)} className={`chip ${range.key === r.key ? "chip-on" : ""}`}>{r.label}</Link>)}
        </div>
      </div>
      <form className="flex flex-wrap items-end gap-2" action="/dashboard">
        <input type="hidden" name="range" value="custom" />
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" className="input" defaultValue={range.from} /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" className="input" defaultValue={range.to} /></div>
        <button className={`chip ${range.key === "custom" ? "chip-on" : ""}`}>Custom range</button>
        <span className="muted text-xs">Showing {range.from} → {range.to} · totals in {base}</span>
      </form>

      {missing > 0 && <p role="status" className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">{missing} transaction(s) are left out because no exchange rate is available. Edit them and enter a rate manually.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={formatMoney(income, base)} tone="pos" />
        <Stat label="Expenses" value={formatMoney(expense, base)} tone="neg" />
        <Stat label="Net this period" value={formatMoney(income.minus(expense), base)} tone={income.gte(expense) ? "pos" : "neg"} />
        <Stat label="Saved this period" value={formatMoney(Decimal.max(income.minus(expense), 0), base)} />
      </div>

      <section aria-label="Balances by currency" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...perCurrency].map(([cur, bal]) => (
          <div key={cur} className="card card-hover flex items-center gap-3">
            <CurrencyTile code={cur} />
            <div className="min-w-0"><div className="muted text-xs">{cur} balance</div><div className="truncate text-lg font-bold">{formatMoney(bal, cur)}</div></div>
          </div>
        ))}
        <div className="card flex flex-col justify-center border-transparent text-white" style={{ background: "linear-gradient(145deg,#0F9488,#0F766E 55%,#115E59)", boxShadow: "0 22px 34px -12px rgba(15,118,110,.65), inset 0 1px 0 rgba(255,255,255,.35)" }}>
          <div className="text-xs">Total in {base} (today’s rates)</div>
          <div className="text-xl font-bold md:text-2xl">{formatMoney(total, base)}</div>
          {totalMissing && <div className="text-xs">Some currencies are missing a rate.</div>}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card"><h2 className="mb-2 font-semibold">Income vs expenses · last 6 months ({base})</h2>
          <IncomeExpenseChart currency={base} data={series.map((m) => ({ label: m.label, income: m.income.toDecimalPlaces(2).toNumber(), expense: m.expense.toDecimalPlaces(2).toNumber() }))} /></section>
        <section className="card"><h2 className="mb-2 font-semibold">Expenses by category</h2>
          {donut.length ? <CategoryDonut data={donut} currency={base} /> : <p className="muted py-10 text-center text-sm">No expenses in this period.</p>}</section>
      </div>

      <section className="card"><div className="mb-1 flex items-center justify-between"><h2 className="font-semibold">Recent transactions</h2><Link href="/transactions" className="text-sm font-medium underline" style={{ color: "var(--accent)" }}>See all</Link></div>
        <TxTable rows={recent} base={base} compact /></section>
    </div>
  );
}
