"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : label}</button>;
}

export function AuthForm({ mode, action }: { mode: "login" | "register"; action: (s: ActionState, f: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useFormState(action, {});
  const isLogin = mode === "login";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="tile" style={{ background: "linear-gradient(145deg,#14A394,#0B5A54)" }}>₹</div>
        <div><div className="text-xl font-bold">SpendWise</div><div className="muted text-sm">Track money in any currency</div></div>
      </div>
      <form action={formAction} className="card space-y-4">
        <h1 className="text-lg font-bold">{isLogin ? "Log in" : "Create your account"}</h1>
        {!isLogin && <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" className="input" autoComplete="name" required /></div>}
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
        <div><label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? 1 : 8} required />
          {!isLogin && <p className="muted mt-1 text-xs">At least 8 characters.</p>}
        </div>
        {state.error && <p role="alert" className="neg rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-950/40">{state.error}</p>}
        <Submit label={isLogin ? "Log in" : "Create account"} />
        <p className="muted text-center text-sm">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold underline" style={{ color: "var(--accent)" }}>{isLogin ? "Create an account" : "Log in"}</Link>
        </p>
      </form>
    </main>
  );
}
