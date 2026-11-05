import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccountsWithBalances, getCategories, getTransactions } from "@/lib/queries";
import { TxTable } from "@/components/TxTable";
import { CURRENCY_CODES } from "@/lib/currencies";

export default async function TransactionsPage({ searchParams: sp }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const [rows, accounts, categories] = await Promise.all([
    getTransactions(user.id, { q: sp.q, type: sp.type, categoryId: sp.category, currency: sp.currency, accountId: sp.account, from: sp.from, to: sp.to, min: sp.min, max: sp.max }),
    getAccountsWithBalances(user.id), getCategories(user.id),
  ]);
  const used = Array.from(new Set(accounts.map((a) => a.currency)));
  const sel = (name: string) => sp[name] ?? "";
  const filtered = Object.values(sp).some(Boolean);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <form className="card grid grid-cols-2 gap-2 md:grid-cols-4" action="/transactions">
        <div className="col-span-2"><label className="label" htmlFor="q">Search description</label><input id="q" name="q" className="input" defaultValue={sel("q")} placeholder="e.g. lunch" /></div>
        <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="input" defaultValue={sel("type")}><option value="">All</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
        <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input" defaultValue={sel("category")}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}</select></div>
        <div><label className="label" htmlFor="currency">Currency</label><select id="currency" name="currency" className="input" defaultValue={sel("currency")}><option value="">All</option>{CURRENCY_CODES.filter((c) => used.includes(c)).map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label" htmlFor="account">Account</label><select id="account" name="account" className="input" defaultValue={sel("account")}><option value="">All</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" className="input" defaultValue={sel("from")} /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" className="input" defaultValue={sel("to")} /></div>
        <div><label className="label" htmlFor="min">Min amount</label><input id="min" name="min" inputMode="decimal" className="input" defaultValue={sel("min")} /></div>
        <div><label className="label" htmlFor="max">Max amount</label><input id="max" name="max" inputMode="decimal" className="input" defaultValue={sel("max")} /></div>
        <div className="col-span-2 flex items-end gap-2"><button className="btn btn-primary">Apply filters</button>{filtered && <Link href="/transactions" className="btn">Clear</Link>}</div>
      </form>
      <section className="card"><div className="muted mb-1 text-xs">{rows.length} result{rows.length === 1 ? "" : "s"} (latest 200 shown)</div><TxTable rows={rows} base={user.baseCurrency.trim()} /></section>
    </div>
  );
}
