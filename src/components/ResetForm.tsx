"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { resendOtpAction, resetPasswordAction } from "@/lib/actions";

function Btn({ label, primary }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn w-full ${primary ? "btn-primary" : ""}`} disabled={pending}>{pending ? "Please wait…" : label}</button>;
}

export function ResetForm({ email }: { email: string }) {
  const [rs, reset] = useFormState(resetPasswordAction, {});
  const [ss, resend] = useFormState(resendOtpAction, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="card space-y-4">
        <div><h1 className="text-lg font-bold">Reset your password</h1>
          <p className="muted mt-1 text-sm">If <b>{email}</b> has an account, we sent a 6-digit code to it. The code works for 10 minutes. Use the same email you signed up with, and check your spam folder too. If you asked for a code a moment ago, use that latest email.</p></div>
        <form action={reset} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          <div><label className="label" htmlFor="code">Code from your email</label>
            <input id="code" name="code" className="input text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" placeholder="••••••" autoFocus required /></div>
          <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required /><p className="muted mt-1 text-xs">At least 8 characters.</p></div>
          <div><label className="label" htmlFor="confirm">Repeat new password</label><input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
          {rs.error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{rs.error}</p>}
          <Btn label="Change my password" primary />
        </form>
        <form action={resend} className="space-y-2">
          <input type="hidden" name="email" value={email} /><input type="hidden" name="purpose" value="reset" />
          <Btn label="Send a new code" />
          {ss.error && <p role="alert" className="neg text-sm">{ss.error}</p>}
          {ss.ok && <p role="status" className="pos text-sm">If the account exists, a new code is on its way.</p>}
        </form>
        <p className="muted text-center text-sm"><Link href="/login" className="font-semibold underline" style={{ color: "var(--accent)" }}>Back to log in</Link></p>
      </div>
    </main>
  );
}
