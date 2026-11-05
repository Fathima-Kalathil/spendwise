// Creates a demo user with sample data:  npm run db:seed
// Login: demo@spendwise.app / Demo@1234
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const bcrypt = (await import("bcryptjs")).default;
  const { db } = await import("../src/db");
  const { users, accounts, categories, transactions } = await import("../src/db/schema");
  const { DEFAULT_CATEGORIES } = await import("../src/lib/defaults");
  const { eq } = await import("drizzle-orm");

  await db.delete(users).where(eq(users.email, "demo@spendwise.app"));
  const [u] = await db.insert(users).values({
    email: "demo@spendwise.app", name: "Demo User", passwordHash: await bcrypt.hash("Demo@1234", 10), baseCurrency: "INR",
  }).returning();
  const cats = await db.insert(categories).values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: u.id }))).returning();
  const accs = await db.insert(accounts).values([
    { userId: u.id, name: "Cash – INR", type: "cash", currency: "INR", openingBalance: "5000" },
    { userId: u.id, name: "Bank – INR", type: "bank", currency: "INR", openingBalance: "40000" },
    { userId: u.id, name: "Wallet – AED", type: "wallet", currency: "AED", openingBalance: "800" },
    { userId: u.id, name: "Cash – USD", type: "cash", currency: "USD", openingBalance: "150" },
  ]).returning();

  const acc = (n: string) => accs.find((a) => a.name.startsWith(n))!;
  const cat = (n: string, t: string) => cats.find((c) => c.name === n && c.type === t)!.id;
  const rates: Record<string, string> = { INR: "1", AED: "22.7", USD: "83.4" };
  const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };

  const rows: [string, string, string, string, string, number, string][] = [
    // type, account, category, amount, description, daysAgo, currency
    ["income", "Bank", "Salary", "50000", "Monthly salary", 3, "INR"],
    ["income", "Wallet", "Freelance", "1200", "Logo design project", 9, "AED"],
    ["expense", "Wallet", "Food", "45", "Lunch", 1, "AED"],
    ["expense", "Wallet", "Transport", "30", "Taxi", 2, "AED"],
    ["expense", "Cash – USD", "Subscriptions", "12", "Netflix", 4, "USD"],
    ["expense", "Bank", "Rent", "15000", "Room rent", 5, "INR"],
    ["expense", "Cash – INR", "Food", "350", "Groceries", 6, "INR"],
    ["expense", "Bank", "Bills", "1800", "Electricity", 8, "INR"],
    ["expense", "Wallet", "Shopping", "220", "Shoes", 12, "AED"],
    ["expense", "Bank", "Education", "2500", "Online course", 15, "INR"],
    ["income", "Bank", "Salary", "50000", "Monthly salary", 33, "INR"],
    ["expense", "Bank", "Rent", "15000", "Room rent", 35, "INR"],
    ["expense", "Wallet", "Entertainment", "90", "Cinema", 40, "AED"],
    ["expense", "Cash – INR", "Travel", "4200", "Train tickets", 50, "INR"],
  ];
  await db.insert(transactions).values(rows.map(([type, a, c, amount, description, ago, currency]) => ({
    userId: u.id, accountId: acc(a).id, categoryId: cat(c, type), type, amount, currency, description,
    rateToBase: rates[currency], baseCurrency: "INR", date: day(ago), paymentMethod: "card",
  })));
  console.log("Demo data ready -> demo@spendwise.app / Demo@1234");
}
main().catch((e) => { console.error(e); process.exit(1); });
