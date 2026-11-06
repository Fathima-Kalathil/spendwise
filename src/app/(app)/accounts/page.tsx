import { requireUser } from "@/lib/auth";
import { getAccountsWithBalances } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { CurrencyTile } from "@/components/ui";
import { AccountForm, TransferForm } from "@/components/AccountForms";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccountsWithBalances(user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My wallets</h1>
      <p className="muted -mt-2 text-sm">A wallet holds money in one currency, like “Cash – INR” or “Bank – AED”. A wallet is added automatically the first time you use a new currency.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="card card-hover flex items-center gap-3">
            <CurrencyTile code={a.currency} />
            <div className="min-w-0"><div className="truncate font-semibold">{a.name}</div><div className="muted text-xs">{a.type} · {a.currency}</div>
              <div className="mt-1 text-lg font-bold">{formatMoney(a.balance, a.currency)}</div></div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2"><AccountForm /><TransferForm accounts={accounts} /></div>
    </div>
  );
}
