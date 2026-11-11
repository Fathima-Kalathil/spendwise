"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addCategory, deleteCategory, updateCategory } from "@/lib/actions";
import { ConfirmDialog } from "./ConfirmDialog";

type Cat = { id: string; name: string; type: string; color: string };

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary !py-1.5" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

function AddForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(addCategory, {});
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="font-semibold">Add a category</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div><label className="label" htmlFor="cn">Name</label><input id="cn" name="name" className="input" maxLength={30} placeholder="e.g. Gym, Pet food, Gifts" required /></div>
        <div><label className="label" htmlFor="ct">Kind</label><select id="ct" name="type" className="input"><option value="expense">Money out (expense)</option><option value="income">Money in (income)</option></select></div>
        <div><label className="label" htmlFor="cc">Colour</label><input id="cc" name="color" type="color" defaultValue="#0F766E" className="h-[42px] w-16 cursor-pointer rounded-xl border p-1" style={{ borderColor: "var(--line)" }} /></div>
      </div>
      {state.error && <p role="alert" className="neg text-sm">{state.error}</p>}
      {state.ok && <p role="status" className="pos text-sm">Category added.</p>}
      <Save label="Add category" />
    </form>
  );
}

function Row({ c, onDelete }: { c: Cat; onDelete: (c: Cat) => void }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useFormState(updateCategory, {});
  useEffect(() => { if (state.ok) setEditing(false); }, [state]);

  if (editing) {
    return (
      <li className="border-t py-2" style={{ borderColor: "var(--line)" }}>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={c.id} />
          <input type="color" name="color" defaultValue={c.color} aria-label="Colour" className="h-9 w-12 cursor-pointer rounded border p-0.5" />
          <input name="name" defaultValue={c.name} aria-label="Name" maxLength={30} required className="input !w-44 !py-1.5" />
          <Save label="Save" />
          <button type="button" className="btn !py-1.5" onClick={() => setEditing(false)}>Cancel</button>
          {state.error && <p role="alert" className="neg w-full text-xs">{state.error}</p>}
        </form>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2 border-t py-2.5" style={{ borderColor: "var(--line)" }}>
      <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} /><span className="truncate">{c.name}</span></span>
      <span className="flex gap-2"><button className="btn !px-3 !py-1" onClick={() => setEditing(true)}>Edit</button><button className="btn !px-3 !py-1" onClick={() => onDelete(c)} aria-label={`Delete ${c.name}`}>Delete</button></span>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [target, setTarget] = useState<Cat | null>(null);
  const [pending, start] = useTransition();
  const group = (type: string, title: string) => (
    <section className="card"><h2 className="mb-1 font-semibold">{title}</h2>
      <ul>{categories.filter((c) => c.type === type).map((c) => <Row key={c.id} c={c} onDelete={setTarget} />)}</ul></section>
  );
  return (
    <div className="space-y-4">
      <AddForm />
      <div className="grid gap-4 md:grid-cols-2">{group("expense", "Money out (expenses)")}{group("income", "Money in (income)")}</div>
      {target && (
        <ConfirmDialog title="Delete this category?" confirmLabel="Delete" pending={pending}
          message={`“${target.name}” will be removed. Items already saved in it will stay, but will show “No category”.`}
          onCancel={() => setTarget(null)} onConfirm={() => start(async () => { await deleteCategory(target.id); setTarget(null); })} />
      )}
    </div>
  );
}
