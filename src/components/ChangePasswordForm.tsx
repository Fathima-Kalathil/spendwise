"use client";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction } from "@/lib/actions";

function Save() { const { pending } = useFormStatus(); return <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>; }

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(changePasswordAction, {});
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="card max-w-lg space-y-3">
      <div><div className="font-semibold">Change password</div><p className="muted mt-1 text-sm">After changing it, you stay logged in here and are logged out on your other devices.</p></div>
      <div><label className="label" htmlFor="cp-current">Current password</label><input id="cp-current" name="current" type="password" className="input" autoComplete="current-password" required /></div>
      <div><label className="label" htmlFor="cp-new">New password</label><input id="cp-new" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
      <div><label className="label" htmlFor="cp-confirm">Repeat new password</label><input id="cp-confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
      {state.error && <p role="alert" className="neg text-sm">{state.error}</p>}
      {state.ok && <p role="status" className="pos text-sm">Password changed.</p>}
      <Save />
    </form>
  );
}
