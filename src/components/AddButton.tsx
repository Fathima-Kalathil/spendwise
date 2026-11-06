"use client";
import { useTxModal } from "./AppShell";

export function AddButton({ label = "+ Add your first transaction", type = "expense" }: { label?: string; type?: "expense" | "income" }) {
  const { openNew } = useTxModal();
  return <button className="btn btn-primary" onClick={() => openNew(type)}>{label}</button>;
}
