import { requireUser } from "@/lib/auth";
import { getAccountsWithBalances, getCategories } from "@/lib/queries";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([getAccountsWithBalances(user.id), getCategories(user.id)]);
  return (
    <AppShell userName={user.name} base={user.baseCurrency.trim()} accounts={accounts} categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}>
      {children}
    </AppShell>
  );
}
