"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { previewRate, saveTransaction } from "@/lib/actions";
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/format";
import { D } from "@/lib/money";
import type { AccountWithBalance } from "@/lib/queries";

export type TxEdit = {
  id: string; type: string; amount: string; currency: string; rateToBase: string | null; date: string; description: string;
  notes: string; paymentMethod: string; accountId: string; categoryId: string | null;
};
type Cat = { id: string; name: string; type: string };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function TxForm({ tx, initialType, base, accounts, categories, onClose }: { tx?: TxEdit; initialType?: "expense" | "income"; base: string; accounts: AccountWithBalance[]; categories: Cat[]; onClose: () => void }) {
  const mine = useMemo(() => Array.from(new Set(accounts.map((a) => a.currency))), [accounts]);
  const others = CURRENCIES.map((c) => c.code as string).filter((c) => !mine.includes(c));
  const [type, setType] = useState<"expense" | "income">((tx?.type as "expense" | "income") ?? initialType ?? "expense");
  const [currency, setCurrency] = useState(() => {
    if (tx) return tx.currency;
    let last = ""; try { last = localStorage.getItem("lastCurrency") ?? ""; } catch {}
    return last || (mine.includes(base) ? base : mine[0] ?? base);
  });
  const [accountId, setAccountId] = useState(tx?.accountId ?? "");
  const [amount, setAmount] = useState(tx?.amount ? D(tx.amount).toString() : "");
  const [date, setDate] = useState(tx?.date ?? today());
  const [rate, setRate] = useState(tx?.rateToBase ? D(tx.rateToBase).toString() : "");
  const [loading, setLoading] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const wallets = accounts.filter((a) => a.currency === currency);
  const chosenWallet = wallets.find((a) => a.id === accountId)?.id ?? wallets[0]?.id ?? ""; // "" = a wallet is created automatically
  const cats = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (currency === base) { setRate("1"); return; }
    if (tx && tx.currency === currency && tx.date === date) return; // keep the saved rate while editing
    let live = true;
    setLoading(true);
    previewRate(currency, base, date).then((r) => {
      if (!live) return;
      setRate(r ? D(r.rate).toString() : ""); setLoading(false);
    });
    return () => { live = false; };
  }, [currency, date, base]); // eslint-disable-line

  let converted = "";
  try { if (amount && rate && D(amount).gt(0) && D(rate).gt(0)) converted = formatMoney(D(amount).mul(rate), base); } catch {}
  const rateOpen = showRate || (!loading && !rate);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveTransaction(fd);
      if (res?.error) setError(res.error);
      else { try { localStorage.setItem("lastCurrency", currency); } catch {} onClose(); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={tx ? "Edit transaction" : "Add transaction"}
        className="card max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto !rounded-b-none md:!rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{tx ? "Edit transaction" : "Add a transaction"}</h2>
          <button type="button" className="btn !px-3 !py-1" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {tx && <input type="hidden" name="id" value={tx.id} />}
        <input type="hidden" name="type" value={type} /><input type="hidden" name="currency" value={currency} />
        <input type="hidden" name="accountId" value={chosenWallet} />
        <input type="hidden" name="paymentMethod" value={tx?.paymentMethod ?? "cash"} /><input type="hidden" name="notes" value={tx?.notes ?? ""} />

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType("expense")} className={`btn ${type === "expense" ? "btn-danger" : ""}`}>Money out (spent)</button>
          <button type="button" onClick={() => setType("income")} className={`btn ${type === "income" ? "btn-primary" : ""}`}>Money in (earned)</button>
        </div>

        <div>
          <label className="label" htmlFor="amount">How much?</label>
          <div className="grid grid-cols-3 gap-2">
            <input id="amount" name="amount" className="input col-span-2 text-2xl font-bold" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
            <select aria-label="Currency" className="input font-semibold" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!!tx}>
              {mine.length > 0 && <optgroup label="Your currencies">{mine.map((c) => <option key={c}>{c}</option>)}</optgroup>}
              <optgroup label="Other currencies">{others.map((c) => <option key={c}>{c}</option>)}</optgroup>
            </select>
          </div>
        </div>

        {currency !== base && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
            {loading ? <span className="muted">Getting today’s exchange rate…</span> : converted ? <div className="font-semibold">That is about {converted}</div> : <span>No automatic rate found. Please type it below.</span>}
            {!rateOpen && !loading && <button type="button" className="muted ml-2 text-xs underline" onClick={() => setShowRate(true)}>Change rate</button>}
            {rateOpen && (
              <div className="mt-2 flex items-center gap-2">
                <span className="whitespace-nowrap">1 {currency} =</span>
                <input name="rate" className="input !w-28 !py-1.5" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={`Exchange rate to ${base}`} />
                <span>{base}</span>
              </div>
            )}
            {!rateOpen && <input type="hidden" name="rate" value={rate} />}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="cat">What was it for?</label>
            <select id="cat" name="categoryId" className="input" defaultValue={tx?.categoryId ?? ""} key={type}><option value="">No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="date">When?</label><input id="date" name="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        </div>
        {wallets.length > 1 && (
          <div><label className="label" htmlFor="wallet">Which wallet?</label>
            <select id="wallet" className="input" value={chosenWallet} onChange={(e) => setAccountId(e.target.value)}>{wallets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        )}
        <div><label className="label" htmlFor="desc">Note (optional)</label><input id="desc" name="description" className="input" defaultValue={tx?.description} maxLength={200} placeholder="e.g. Lunch with friends" /></div>

        {error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-[2]" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
