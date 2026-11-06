"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updateSettings } from "@/lib/actions";
import { CURRENCIES } from "@/lib/currencies";

function Submit() { const { pending } = useFormStatus(); return <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>; }

export function SettingsForm({ name, base, email }: { name: string; base: string; email: string }) {
  const [state, action] = useFormState(updateSettings, {});
  return (
    <form action={action} className="card max-w-lg space-y-3">
      <div><label className="label" htmlFor="sn">Name</label><input id="sn" name="name" className="input" defaultValue={name} required /></div>
      <div><label className="label">Email</label><div className="muted text-sm">{email}</div></div>
      <div><label className="label" htmlFor="sb">Main currency</label>
        <select id="sb" name="baseCurrency" className="input" defaultValue={base}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select>
        <p className="muted mt-1 text-xs">Totals and charts are shown in this currency. Your original amounts never change, so you can switch any time.</p></div>
      {state.error && <p role="alert" className="neg text-sm">{state.error}</p>}
      {state.ok && <p role="status" className="pos text-sm">Settings saved.</p>}
      <Submit />
    </form>
  );
}
