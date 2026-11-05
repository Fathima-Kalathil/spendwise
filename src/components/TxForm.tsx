"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { previewRate, saveTransaction } from "@/lib/actions";
import { PAYMENT_METHODS } from "@/lib/currencies";
import { formatMoney } from "@/lib/format";
import { D } from "@/lib/money";
import type { AccountWithBalance } from "@/lib/queries";

export type TxEdit = {
  id: string; type: string; amount: string; currency: string; rateToBase: string | null; date: string; description: string;
  notes: string; paymentMethod: string; accountId: string; categoryId: string | null;
};
type Cat = { id: string; name: string; type: string };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function TxForm({ tx, base, accounts, categories, onClose }: { tx?: TxEdit; base: string; accounts: AccountWithBalance[]; categories: Cat[]; onClose: () => void }) {
  const currencies = useMemo(() => Array.from(new Set(accounts.map((a) => a.currency))), [accounts]);
  const [type, setType] = useState<"expense" | "income">((tx?.type as "expense" | "income") ?? "expense");
  const [currency, setCurrency] = useState(() => {
    if (tx) return tx.currency;
    let last = ""; try { last = localStorage.getItem("lastCurrency") ?? ""; } catch {}
    return currencies.includes(last) ? last : currencies.includes(base) ? base : currencies[0] ?? base;
  });
  const [accountId, setAccountId] = useState(tx?.accountId ?? "");
  const [amount, setAmount] = useState(tx?.amount ? String(D(tx.amount).toString()) : "");
  const [date, setDate] = useState(tx?.date ?? today());
  const [rate, setRate] = useState(tx?.rateToBase ? D(tx.rateToBase).toString() : "");
  const [rateNote, setRateNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const accs = accounts.filter((a) => a.currency === currency);
  const cats = categories.filter((c) => c.type === type);

  useEffect(() => { if (!accs.some((a) => a.id === accountId)) setAccountId(accs[0]?.id ?? ""); }, [currency]); // eslint-disable-line

  useEffect(() => {
    if (currency === base) { setRate("1"); setRateNote(""); return; }
    if (tx && tx.currency === currency && tx.date === date) return; // keep the saved rate while editing
    let live = true;
    setRateNote("Fetching rate…");
    previewRate(currency, base, date).then((r) => {
      if (!live) return;
      if (r) { setRate(D(r.rate).toString()); setRateNote(`Auto rate · ${r.source}`); }
      else { setRate(""); setRateNote("Rate unavailable. Enter it manually."); }
    });
    return () => { live = false; };
  }, [currency, date, base]); // eslint-disable-line

  let converted = "";
  try { if (amount && rate && D(amount).gt(0) && D(rate).gt(0)) converted = formatMoney(D(amount).mul(rate), base); } catch {}

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
        className="card max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto !rounded-b-none md:!rounded-b-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{tx ? "Edit transaction" : "Add transaction"}</h2>
          <button type="button" className="btn !px-3 !py-1" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {tx && <input type="hidden" name="id" value={tx.id} />}
        <input type="hidden" name="type" value={type} /><input type="hidden" name="currency" value={currency} />
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`chip ${type === t ? "chip-on" : ""}`}>{t === "expense" ? "Expense" : "Income"}</button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><label className="label" htmlFor="amount">Amount</label>
            <input id="amount" name="amount" className="input text-xl font-bold" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div><label className="label" htmlFor="cur">Currency</label>
            <select id="cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!!tx}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>

        {currency !== base && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">1 {currency} =</span>
              <input name="rate" className="input !w-28 !py-1.5" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={`Exchange rate to ${base}`} />
              <span>{base}</span>
            </div>
            <div className="muted mt-1 text-xs">{rateNote}</div>
            {converted && <div className="mt-1 font-semibold">≈ {converted}</div>}
          </div>
        )}

        <div><label className="label" htmlFor="acc">Account</label>
          {accs.length ? (
            <select id="acc" name="accountId" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          ) : <p className="muted text-sm">No account in {currency}. <Link href="/accounts" className="underline" onClick={onClose}>Create one</Link>.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="cat">Category</label>
            <select id="cat" name="categoryId" className="input" defaultValue={tx?.categoryId ?? ""} key={type}><option value="">No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="desc">Description</label><input id="desc" name="description" className="input" defaultValue={tx?.description} maxLength={200} placeholder="e.g. Lunch" /></div>
          <div><label className="label" htmlFor="pm">Payment method</label>
            <select id="pm" name="paymentMethod" className="input" defaultValue={tx?.paymentMethod ?? "card"}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <div><label className="label" htmlFor="notes">Notes</label><input id="notes" name="notes" className="input" defaultValue={tx?.notes} maxLength={1000} placeholder="Optional" /></div>

        {error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-[2]" disabled={pending || !accs.length}>{pending ? "Saving…" : tx ? "Save changes" : type === "expense" ? "Save expense" : "Save income"}</button>
        </div>
      </form>
    </div>
  );
}
