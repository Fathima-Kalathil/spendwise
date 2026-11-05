"use client";
import { useState, useTransition } from "react";
import { deleteTransaction } from "@/lib/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { D } from "@/lib/money";
import type { TxRow } from "@/lib/queries";
import { useTxModal } from "./AppShell";

export function TxTable({ rows, base, compact }: { rows: TxRow[]; base: string; compact?: boolean }) {
  const { openTx } = useTxModal();
  const [target, setTarget] = useState<TxRow | null>(null);
  const [pending, start] = useTransition();

  if (!rows.length) return <p className="muted py-8 text-center text-sm">No transactions here yet. Tap “Add transaction” to record your first one.</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead><tr><th className="th">Date</th><th className="th">Details</th><th className="th text-right">Amount</th>{!compact && <th className="th" />}</tr></thead>
          <tbody>
            {rows.map((r) => {
              const sign = r.type === "income" ? "+" : "−";
              const showConv = r.currency !== base && r.baseCurrency === base && r.rateToBase;
              return (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="td">
                    <div className="font-medium">{r.description || r.categoryName || "Transaction"}</div>
                    <div className="muted flex items-center gap-1.5 text-xs">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.categoryColor ?? "#9CA3AF" }} />{r.categoryName ?? "No category"} · {r.accountName}
                    </div>
                  </td>
                  <td className={`td text-right font-semibold ${r.type === "income" ? "pos" : "neg"}`}>
                    {sign} {formatMoney(r.amount, r.currency)}
                    {showConv && <div className="muted text-xs font-normal">≈ {formatMoney(D(r.amount).mul(r.rateToBase!), base)} @ {D(r.rateToBase!).toString()}</div>}
                  </td>
                  {!compact && (
                    <td className="td whitespace-nowrap text-right">
                      <button className="btn !px-3 !py-1" onClick={() => openTx({ id: r.id, type: r.type, amount: r.amount, currency: r.currency, rateToBase: r.rateToBase, date: r.date, description: r.description, notes: r.notes, paymentMethod: r.paymentMethod, accountId: r.accountId, categoryId: r.categoryId })}>Edit</button>{" "}
                      <button className="btn !px-3 !py-1" onClick={() => setTarget(r)} aria-label={`Delete ${r.description || "transaction"}`}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTarget(null)}>
          <div role="alertdialog" aria-modal="true" className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Delete this transaction?</h2>
            <p className="muted text-sm">{target.description || target.categoryName} · {formatMoney(target.amount, target.currency)}. This can’t be undone.</p>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => setTarget(null)}>Keep it</button>
              <button className="btn btn-danger flex-1" disabled={pending} onClick={() => start(async () => { await deleteTransaction(target.id); setTarget(null); })}>{pending ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
