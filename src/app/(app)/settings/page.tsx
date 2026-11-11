import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Settings</h1><SettingsForm name={user.name} email={user.email} base={user.baseCurrency.trim()} />
    <div className="card max-w-lg"><div className="font-semibold">Categories</div><p className="muted mt-1 text-sm">Add your own categories like Gym or Pet food, rename them, or remove the ones you don’t use.</p><Link href="/categories" className="btn mt-3">Manage categories</Link></div>
    <ChangePasswordForm />
    <div className="card max-w-lg"><div className="font-semibold">Wallets</div><p className="muted mt-1 text-sm">Wallets are created automatically. You only need this page to add a bank or cash wallet with a starting balance, or to move money between wallets.</p><Link href="/accounts" className="btn mt-3">Manage wallets</Link></div>
    <div className="card max-w-lg"><div className="font-semibold">Account</div><p className="muted mt-1 text-sm">Done for now? Log out to keep your data private on shared devices.</p><div className="mt-3"><LogoutButton className="btn" /></div></div></div>);
}
