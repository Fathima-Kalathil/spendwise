"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction } from "@/lib/actions";

function Btn() { const { pending } = useFormStatus(); return <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : "Send me a code"}</button>; }

export function ForgotForm() {
  const [state, action] = useFormState(forgotPasswordAction, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <form action={action} className="card space-y-4">
        <div><h1 className="text-lg font-bold">Forgot your password?</h1><p className="muted mt-1 text-sm">Enter your email and we’ll send a 6-digit code to reset it.</p></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" autoFocus required /></div>
        {state.error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{state.error}</p>}
        <Btn />
        <p className="muted text-center text-sm"><Link href="/login" className="font-semibold underline" style={{ color: "var(--accent)" }}>Back to log in</Link></p>
      </form>
    </main>
  );
}
