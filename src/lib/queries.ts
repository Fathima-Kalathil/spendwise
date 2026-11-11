import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, budgets, categories, transactions, transfers } from "@/db/schema";
import { accountBalance } from "./balances";

/** Every query below is scoped by userId, so users can only ever see their own data. */

export async function getAccountsWithBalances(userId: string) {
  const accs = await db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt));
  const sums = await db.select({
    accountId: transactions.accountId, type: transactions.type,
    total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
  }).from(transactions).where(eq(transactions.userId, userId)).groupBy(transactions.accountId, transactions.type);
  const ins = await db.select({ id: transfers.toAccountId, total: sql<string>`coalesce(sum(${transfers.amountIn}), 0)` })
    .from(transfers).where(eq(transfers.userId, userId)).groupBy(transfers.toAccountId);
  const outs = await db.select({ id: transfers.fromAccountId, total: sql<string>`coalesce(sum(${transfers.amountOut}), 0)` })
    .from(transfers).where(eq(transfers.userId, userId)).groupBy(transfers.fromAccountId);

  return accs.map((a) => {
    const pick = (type: string) => sums.find((s) => s.accountId === a.id && s.type === type)?.total ?? "0";
    const balance = accountBalance({
      opening: a.openingBalance, income: pick("income"), expense: pick("expense"),
      transfersIn: ins.find((i) => i.id === a.id)?.total ?? "0", transfersOut: outs.find((o) => o.id === a.id)?.total ?? "0",
    });
    return { id: a.id, name: a.name, type: a.type, currency: a.currency.trim(), balance: balance.toFixed(4) };
  });
}
export type AccountWithBalance = Awaited<ReturnType<typeof getAccountsWithBalances>>[number];

export async function getCategories(userId: string) {
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.type), asc(categories.name));
}

export type TxFilters = {
  q?: string; type?: string; categoryId?: string; currency?: string; accountId?: string;
  from?: string; to?: string; min?: string; max?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NUM = /^\d+(\.\d{1,4})?$/;

function buildConds(userId: string, f: TxFilters) {
  const conds = [eq(transactions.userId, userId)];
  if (f.q?.trim()) conds.push(ilike(transactions.description, `%${f.q.trim()}%`));
  if (f.type === "income" || f.type === "expense") conds.push(eq(transactions.type, f.type));
  if (f.categoryId && UUID.test(f.categoryId)) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.accountId && UUID.test(f.accountId)) conds.push(eq(transactions.accountId, f.accountId));
  if (f.currency && /^[A-Z]{3}$/.test(f.currency)) conds.push(eq(transactions.currency, f.currency));
  if (f.from && DATE.test(f.from)) conds.push(gte(transactions.date, f.from));
  if (f.to && DATE.test(f.to)) conds.push(lte(transactions.date, f.to));
  if (f.min && NUM.test(f.min)) conds.push(gte(transactions.amount, f.min));
  if (f.max && NUM.test(f.max)) conds.push(lte(transactions.amount, f.max));
  return conds;
}

export async function countTransactions(userId: string, f: TxFilters = {}): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(transactions).where(and(...buildConds(userId, f)));
  return r?.n ?? 0;
}

export async function getTransactions(userId: string, f: TxFilters = {}, limit = 200, offset = 0) {
  const conds = buildConds(userId, f);

  const rows = await db.select({
    id: transactions.id, type: transactions.type, amount: transactions.amount, currency: transactions.currency,
    rateToBase: transactions.rateToBase, baseCurrency: transactions.baseCurrency, date: transactions.date,
    description: transactions.description, notes: transactions.notes, paymentMethod: transactions.paymentMethod,
    accountId: transactions.accountId, accountName: accounts.name,
    categoryId: transactions.categoryId, categoryName: categories.name, categoryColor: categories.color,
  }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conds)).orderBy(desc(transactions.date), desc(transactions.createdAt)).limit(limit).offset(offset);

  return rows.map((r) => ({ ...r, currency: r.currency.trim(), baseCurrency: r.baseCurrency?.trim() ?? null }));
}
export type TxRow = Awaited<ReturnType<typeof getTransactions>>[number];

export async function getBudgets(userId: string) {
  const rows = await db.select().from(budgets).where(eq(budgets.userId, userId));
  return rows.map((r) => ({ categoryId: r.categoryId, amount: r.amount }));
}
