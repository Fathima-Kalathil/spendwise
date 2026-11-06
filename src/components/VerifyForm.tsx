"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { resendOtpAction, verifyOtpAction } from "@/lib/actions";

function Btn({ label, primary }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn w-full ${primary ? "btn-primary" : ""}`} disabled={pending}>{pending ? "Please wait…" : label}</button>;
}

export function VerifyForm({ email }: { email: string }) {
  const [vs, verify] = useFormState(verifyOtpAction, {});
  const [rs, resend] = useFormState(resendOtpAction, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="card space-y-4">
        <div><h1 className="text-lg font-bold">Check your email</h1>
          <p className="muted mt-1 text-sm">We sent a 6-digit code to <b>{email}</b>. It works for 10 minutes. Check your spam folder if you don’t see it.</p></div>
        <form action={verify} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          <div><label className="label" htmlFor="code">Verification code</label>
            <input id="code" name="code" className="input text-center text-2xl font-bold tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" placeholder="••••••" autoFocus required /></div>
          {vs.error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{vs.error}</p>}
          <Btn label="Verify and continue" primary />
        </form>
        <form action={resend} className="space-y-2">
          <input type="hidden" name="email" value={email} />
          <Btn label="Send a new code" />
          {rs.error && <p role="alert" className="neg text-sm">{rs.error}</p>}
          {rs.ok && <p role="status" className="pos text-sm">A new code is on its way.</p>}
        </form>
        <p className="muted text-center text-sm">Wrong email? <Link href="/register" className="font-semibold underline" style={{ color: "var(--accent)" }}>Start again</Link></p>
      </div>
    </main>
  );
}
