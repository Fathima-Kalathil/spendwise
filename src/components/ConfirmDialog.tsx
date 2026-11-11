"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** A centred "are you sure?" box, drawn on <body> so it covers the whole page. */
export function ConfirmDialog({ title, message, confirmLabel, pending, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; pending?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="muted text-sm">{message}</p>
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>Keep it</button>
          <button className="btn btn-danger flex-1" disabled={pending} onClick={onConfirm}>{pending ? "Deleting…" : confirmLabel}</button>
        </div>
      </div>
    </div>, document.body);
}
