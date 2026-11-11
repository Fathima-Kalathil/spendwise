import { requireUser } from "@/lib/auth";
import { getBudgets, getCategories } from "@/lib/queries";
import { BudgetForm } from "@/components/BudgetForm";
import { D } from "@/lib/money";

export default async function BudgetPage() {
  const user = await requireUser();
  const [cats, budgets] = await Promise.all([getCategories(user.id), getBudgets(user.id)]);
  const overall = budgets.find((b) => b.categoryId === null);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Budget</h1><p className="muted text-sm">Your budget repeats every month. Amounts are in {user.baseCurrency.trim()} (your main currency).</p></div>
      <BudgetForm base={user.baseCurrency.trim()} overall={overall ? D(overall.amount).toString() : ""}
        cats={cats.filter((c) => c.type === "expense").map((c) => ({ id: c.id, name: c.name, color: c.color, limit: (() => { const b = budgets.find((x) => x.categoryId === c.id); return b ? D(b.amount).toString() : ""; })() }))} />
    </div>
  );
}
