"use client";
import { useState } from "react";
import { logoutAction } from "@/lib/actions";

export function LogoutButton({ className = "btn w-full" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>Log out</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 id="logout-title" className="text-lg font-bold">Log out?</h2>
            <p className="muted text-sm">Are you sure you want to log out?</p>
            <div className="flex gap-2">
              <button type="button" className="btn flex-1" onClick={() => setOpen(false)}>Stay logged in</button>
              <form action={logoutAction} className="flex-1"><button className="btn btn-danger w-full">Yes, log out</button></form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
