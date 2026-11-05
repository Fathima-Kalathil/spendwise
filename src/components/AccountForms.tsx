"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAccount, createTransfer, previewRate } from "@/lib/actions";
import { ACCOUNT_TYPES, CURRENCIES } from "@/lib/currencies";
import { D } from "@/lib/money";
import type { AccountWithBalance } from "@/lib/queries";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export function AccountForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(createAccount, {});
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="font-semibold">New account or wallet</h2>
      <div><label className="label" htmlFor="an">Name</label><input id="an" name="name" className="input" placeholder="e.g. Bank – INR" required maxLength={40} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="at">Type</label><select id="at" name="type" className="input">{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="label" htmlFor="ac">Currency</label><select id="ac" name="currency" className="input" defaultValue="INR">{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="ob">Opening balance</label><input id="ob" name="openingBalance" className="input" inputMode="decimal" defaultValue="0" /></div>
      {state.error && <p role="alert" className="neg text-sm">{state.error}</p>}
      {state.ok && <p role="status" className="pos text-sm">Account added.</p>}
      <Submit label="Add account" />
    </form>
  );
}

export function TransferForm({ accounts }: { accounts: AccountWithBalance[] }) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [out, setOut] = useState("");
  const [inn, setInn] = useState("");
  const [edited, setEdited] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean }>({});
  const [rateInfo, setRateInfo] = useState("");
  const [pending, start] = useTransition();

  const a = accounts.find((x) => x.id === from), b = accounts.find((x) => x.id === to);
  const cross = !!a && !!b && a.currency !== b.currency;

  useEffect(() => {
    if (!cross || !a || !b || !out || edited) return;
    let live = true;
    previewRate(a.currency, b.currency, date).then((r) => {
      if (!live) return;
      if (r) { try { setInn(D(out).mul(r.rate).toDecimalPlaces(2).toString()); } catch {} setRateInfo(`Suggested at 1 ${a.currency} = ${D(r.rate).toString()} ${b.currency}. Edit to match what you actually received.`); }
      else setRateInfo("Rate unavailable. Enter the received amount yourself.");
    });
    return () => { live = false; };
  }, [cross, from, to, out, date, edited]); // eslint-disable-line

  if (accounts.length < 2) return <div className="card"><h2 className="font-semibold">Transfer between accounts</h2><p className="muted mt-1 text-sm">Create at least two accounts to move money between them.</p></div>;

  return (
    <form className="card space-y-3" onSubmit={(e) => {
      e.preventDefault(); setMsg({});
      const fd = new FormData(e.currentTarget);
      start(async () => { const r = await createTransfer(fd); setMsg(r); if (r.ok) { setOut(""); setInn(""); setEdited(false); setNote(""); } });
    }}>
      <h2 className="font-semibold">Transfer between accounts</h2>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="tf">From</label><select id="tf" name="fromAccountId" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setEdited(false); }}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label className="label" htmlFor="tt">To</label><select id="tt" name="toAccountId" className="input" value={to} onChange={(e) => { setTo(e.target.value); setEdited(false); }}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="to1">Amount sent{a ? ` (${a.currency})` : ""}</label><input id="to1" name="amountOut" className="input" inputMode="decimal" value={out} onChange={(e) => { setOut(e.target.value); setEdited(false); }} required /></div>
        {cross ? <div><label className="label" htmlFor="to2">Amount received ({b!.currency})</label><input id="to2" name="amountIn" className="input" inputMode="decimal" value={inn} onChange={(e) => { setInn(e.target.value); setEdited(true); }} required /></div>
          : <div><label className="label" htmlFor="td">Date</label><input id="td" name="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>}
      </div>
      {cross && <div><label className="label" htmlFor="td2">Date</label><input id="td2" name="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /><p className="muted mt-1 text-xs">{rateInfo}</p></div>}
      <div><label className="label" htmlFor="tn">Note</label><input id="tn" name="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional" /></div>
      {msg.error && <p role="alert" className="neg text-sm">{msg.error}</p>}
      {msg.ok && <p role="status" className="pos text-sm">Transfer saved.</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Transfer"}</button>
    </form>
  );
}
