"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { TxForm, type TxEdit } from "./TxForm";
import type { AccountWithBalance } from "@/lib/queries";

type Cat = { id: string; name: string; type: string };
const ModalCtx = createContext<{ openTx: (tx?: TxEdit) => void }>({ openTx: () => {} });
export const useTxModal = () => useContext(ModalCtx);

const NAV = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" }, { href: "/settings", label: "Settings" },
];

export function AppShell(props: { userName: string; base: string; accounts: AccountWithBalance[]; categories: Cat[]; children: React.ReactNode }) {
  const path = usePathname();
  const [modal, setModal] = useState<{ tx?: TxEdit } | null>(null);
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <ModalCtx.Provider value={{ openTx: (tx) => setModal({ tx }) }}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r p-4 md:flex" style={{ borderColor: "var(--card1)", background: "color-mix(in srgb, var(--card1) 70%, transparent)", backdropFilter: "blur(10px)" }}>
          <div className="mb-4 px-2 text-lg font-bold" style={{ color: "var(--accent)" }}>SpendWise</div>
          {NAV.map((n) => <Link key={n.href} href={n.href} className={`nav-link ${path.startsWith(n.href) ? "nav-on" : ""}`}>{n.label}</Link>)}
          <button className="btn btn-primary mt-4" onClick={() => setModal({})}>+ Add transaction</button>
          <div className="mt-auto space-y-2">
            <button className="btn w-full" onClick={toggle}>{dark ? "Light mode" : "Dark mode"}</button>
            <div className="muted truncate px-1 text-xs">{props.userName}</div>
            <form action={logoutAction}><button className="btn w-full">Sign out</button></form>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 md:pb-8">
          <div className="mx-auto max-w-6xl p-4 md:p-6">{props.children}</div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around rounded-t-3xl md:hidden" style={{ background: "var(--card1)", boxShadow: "0 -10px 24px -10px rgba(30,41,59,.3)" }}>
          {NAV.slice(0, 2).map((n) => <Link key={n.href} href={n.href} className="px-3 py-2 text-xs font-medium" style={{ color: path.startsWith(n.href) ? "var(--accent)" : "var(--muted)" }}>{n.label}</Link>)}
          <button aria-label="Add transaction" onClick={() => setModal({})} className="btn btn-primary -mt-8 h-14 w-14 !rounded-full !p-0 text-2xl">+</button>
          {NAV.slice(2).map((n) => <Link key={n.href} href={n.href} className="px-3 py-2 text-xs font-medium" style={{ color: path.startsWith(n.href) ? "var(--accent)" : "var(--muted)" }}>{n.label}</Link>)}
        </nav>
      </div>

      {modal && <TxForm tx={modal.tx} base={props.base} accounts={props.accounts} categories={props.categories} onClose={() => setModal(null)} />}
    </ModalCtx.Provider>
  );
}
