"use client";
import { useFormState, useFormStatus } from "react-dom";
import { saveBudgets } from "@/lib/actions";

function Save() { const { pending } = useFormStatus(); return <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save budget"}</button>; }

export function BudgetForm({ base, overall, cats }: { base: string; overall: string; cats: { id: string; name: string; color: string; limit: string }[] }) {
  const [state, action] = useFormState(saveBudgets, {});
  return (
    <form action={action} className="card max-w-xl space-y-5">
      <div>
        <label className="label" htmlFor="overall">Monthly budget ({base})</label>
        <input id="overall" name="overall" inputMode="decimal" className="input text-lg font-bold" defaultValue={overall} placeholder="e.g. 10000" />
        <p className="muted mt-1 text-xs">The most you want to spend in one month. Leave it empty if you don’t want a budget.</p>
      </div>
      <div>
        <div className="font-semibold">Limits for each category (optional)</div>
        <p className="muted mb-2 text-xs">For example Food 3000. Leave a box empty for no limit.</p>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
              <label htmlFor={`b-${c.id}`} className="flex-1 text-sm">{c.name}</label>
              <input id={`b-${c.id}`} name={`cat_${c.id}`} inputMode="decimal" className="input !w-32" defaultValue={c.limit} placeholder="No limit" />
            </div>
          ))}
        </div>
      </div>
      {state.error && <p role="alert" className="neg text-sm">{state.error}</p>}
      {state.ok && <p role="status" className="pos text-sm">Budget saved. You’ll see it on the Home page.</p>}
      <Save />
    </form>
  );
}
