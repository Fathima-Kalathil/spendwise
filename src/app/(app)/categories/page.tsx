import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/queries";
import { CategoryManager } from "@/components/CategoryManager";

export default async function CategoriesPage() {
  const user = await requireUser();
  const cats = await getCategories(user.id);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Categories</h1><p className="muted text-sm">Add your own, rename them, or remove the ones you don’t use.</p></div>
      <CategoryManager categories={cats.map((c) => ({ id: c.id, name: c.name, type: c.type, color: c.color }))} />
    </div>
  );
}
