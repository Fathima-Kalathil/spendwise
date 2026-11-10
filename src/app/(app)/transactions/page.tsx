import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { countTransactions, getAccountsWithBalances, getCategories, getTransactions } from "@/lib/queries";
import { Pagination } from "@/components/Pagination";
import { TxTable } from "@/components/TxTable";
import { CURRENCY_CODES } from "@/lib/currencies";

const PAGE_SIZE = 15;

export default async function HistoryPage({ searchParams: sp }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const filters = { q: sp.q, type: sp.type, categoryId: sp.category, currency: sp.currency, accountId: sp.account, from: sp.from, to: sp.to, min: sp.min, max: sp.max };
  const total = await countTransactions(user.id, filters);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), totalPages);
  const [rows, accounts, categories] = await Promise.all([
    getTransactions(user.id, filters, PAGE_SIZE, (page - 1) * PAGE_SIZE), getAccountsWithBalances(user.id), getCategories(user.id),
  ]);
  const used = Array.from(new Set(accounts.map((a) => a.currency)));
  const sel = (name: string) => sp[name] ?? "";
  const moreActive = ["type", "category", "currency", "account", "from", "to", "min", "max"].some((k) => sp[k]);
  const filtered = moreActive || !!sp.q;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <form className="card space-y-3" action="/transactions">
        <div className="flex gap-2">
          <input aria-label="Search" name="q" className="input" defaultValue={sel("q")} placeholder="Search your notes, e.g. lunch" />
          <button className="btn btn-primary">Search</button>
          {filtered && <Link href="/transactions" className="btn">Clear</Link>}
        </div>
        <details open={moreActive}>
          <summary className="muted cursor-pointer text-sm">More filters (type, category, currency, dates, amount)</summary>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="input" defaultValue={sel("type")}><option value="">All</option><option value="income">Money in</option><option value="expense">Money out</option></select></div>
            <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input" defaultValue={sel("category")}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === "income" ? "in" : "out"})</option>)}</select></div>
            <div><label className="label" htmlFor="currency">Currency</label><select id="currency" name="currency" className="input" defaultValue={sel("currency")}><option value="">All</option>{CURRENCY_CODES.filter((c) => used.includes(c)).map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="account">Wallet</label><select id="account" name="account" className="input" defaultValue={sel("account")}><option value="">All</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="label" htmlFor="from">From date</label><input id="from" name="from" type="date" className="input" defaultValue={sel("from")} /></div>
            <div><label className="label" htmlFor="to">To date</label><input id="to" name="to" type="date" className="input" defaultValue={sel("to")} /></div>
            <div><label className="label" htmlFor="min">Smallest amount</label><input id="min" name="min" inputMode="decimal" className="input" defaultValue={sel("min")} /></div>
            <div><label className="label" htmlFor="max">Biggest amount</label><input id="max" name="max" inputMode="decimal" className="input" defaultValue={sel("max")} /></div>
          </div>
        </details>
      </form>
      <section className="card"><div className="muted mb-1 text-xs">{total} result{total === 1 ? "" : "s"}</div><TxTable rows={rows} base={user.baseCurrency.trim()} /><Pagination page={page} totalPages={totalPages} params={sp} /></section>
    </div>
  );
}
