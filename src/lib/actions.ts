"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, categories, transactions, transfers, users } from "@/db/schema";
import { createSession, destroySession, requireUser } from "./auth";
import { getRate } from "./fx";
import { D, isValidAmount, isValidRate } from "./money";
import { ACCOUNT_TYPES, CURRENCY_CODES, PAYMENT_METHODS } from "./currencies";
import { DEFAULT_CATEGORIES } from "./defaults";

export type ActionState = { error?: string; ok?: boolean };
const refresh = () => revalidatePath("/", "layout");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

// ---------------------------------------------------------------- auth
export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({
    name: z.string().trim().min(2, "Enter your name.").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(100),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };

  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, p.data.email)).limit(1);
  if (exists.length) return { error: "An account with this email already exists. Try signing in." };

  const passwordHash = await bcrypt.hash(p.data.password, 10);
  const [u] = await db.insert(users).values({ name: p.data.name, email: p.data.email, passwordHash }).returning({ id: users.id });
  await db.insert(categories).values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: u.id })));
  await db.insert(accounts).values([
    { userId: u.id, name: "Cash – INR", type: "cash", currency: "INR" },
    { userId: u.id, name: "Wallet – AED", type: "wallet", currency: "AED" },
  ]);
  await createSession(u.id);
  redirect("/dashboard");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter your email and password." };
  const [u] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  const ok = u ? await bcrypt.compare(p.data.password, u.passwordHash) : false;
  if (!u || !ok) return { error: "Incorrect email or password." };
  await createSession(u.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}

// ---------------------------------------------------------------- rates
export async function previewRate(from: string, to: string, date: string) {
  await requireUser();
  if (!CURRENCY_CODES.includes(from) || !CURRENCY_CODES.includes(to) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return getRate(from, to, date);
}

// ---------------------------------------------------------------- transactions
export async function saveTransaction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    type: z.enum(["income", "expense"]),
    accountId: z.string().uuid("Choose an account."),
    categoryId: z.string().uuid().optional().or(z.literal("")),
    amount: z.string().trim(),
    currency: z.string().length(3),
    rate: z.string().trim().optional(),
    date: dateStr,
    description: z.string().trim().max(200).default(""),
    notes: z.string().trim().max(1000).default(""),
    paymentMethod: z.enum(PAYMENT_METHODS),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  if (!isValidAmount(v.amount)) return { error: "Enter an amount greater than 0 (up to 4 decimals)." };

  const [acc] = await db.select().from(accounts).where(and(eq(accounts.id, v.accountId), eq(accounts.userId, user.id))).limit(1);
  if (!acc) return { error: "Account not found." };
  if (acc.currency.trim() !== v.currency) return { error: `This account uses ${acc.currency.trim()}. Pick an account in ${v.currency}.` };

  if (v.categoryId) {
    const [cat] = await db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, v.categoryId), eq(categories.userId, user.id), eq(categories.type, v.type))).limit(1);
    if (!cat) return { error: "Category not found." };
  }

  const base = user.baseCurrency.trim();
  let rate = "1";
  if (v.currency !== base) {
    if (v.rate && isValidRate(v.rate)) rate = v.rate;
    else {
      const r = await getRate(v.currency, base, v.date);
      if (!r) return { error: `Couldn't fetch the ${v.currency}→${base} rate. Enter the exchange rate manually.` };
      rate = r.rate;
    }
  }

  const values = {
    type: v.type, accountId: v.accountId, categoryId: v.categoryId || null, amount: v.amount, currency: v.currency,
    rateToBase: rate, baseCurrency: base, date: v.date, description: v.description, notes: v.notes, paymentMethod: v.paymentMethod,
  };
  if (v.id) {
    await db.update(transactions).set(values).where(and(eq(transactions.id, v.id), eq(transactions.userId, user.id)));
  } else {
    await db.insert(transactions).values({ ...values, userId: user.id });
  }
  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return;
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  refresh();
}

// ---------------------------------------------------------------- accounts & transfers
export async function createAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({
    name: z.string().trim().min(1, "Give the account a name.").max(40),
    type: z.enum(ACCOUNT_TYPES),
    currency: z.string().refine((c) => CURRENCY_CODES.includes(c), "Choose a currency."),
    openingBalance: z.string().trim().regex(/^-?\d+(\.\d{1,4})?$/, "Opening balance must be a number.").default("0"),
  }).safeParse({ ...Object.fromEntries(fd), openingBalance: String(fd.get("openingBalance") || "0") });
  if (!p.success) return { error: firstError(p.error) };
  await db.insert(accounts).values({ userId: user.id, ...p.data });
  refresh();
  return { ok: true };
}

export async function createTransfer(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({
    fromAccountId: z.string().uuid("Choose the source account."), toAccountId: z.string().uuid("Choose the destination account."),
    amountOut: z.string().trim(), amountIn: z.string().trim().optional(), date: dateStr, note: z.string().trim().max(200).default(""),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  if (v.fromAccountId === v.toAccountId) return { error: "Choose two different accounts." };
  if (!isValidAmount(v.amountOut)) return { error: "Enter the amount to send (greater than 0)." };

  const rows = await db.select().from(accounts).where(eq(accounts.userId, user.id));
  const from = rows.find((a) => a.id === v.fromAccountId), to = rows.find((a) => a.id === v.toAccountId);
  if (!from || !to) return { error: "Account not found." };

  let amountIn = v.amountOut;
  if (from.currency.trim() !== to.currency.trim()) {
    if (!v.amountIn || !isValidAmount(v.amountIn)) return { error: `Enter how much ${to.currency.trim()} was received.` };
    amountIn = v.amountIn;
  }
  const rate = D(amountIn).div(v.amountOut).toDecimalPlaces(8).toString(); // the rate actually obtained
  await db.insert(transfers).values({ userId: user.id, fromAccountId: from.id, toAccountId: to.id, amountOut: v.amountOut, amountIn, rate, date: v.date, note: v.note });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- settings
export async function updateSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({
    name: z.string().trim().min(2, "Enter your name.").max(60),
    baseCurrency: z.string().refine((c) => CURRENCY_CODES.includes(c), "Choose a currency."),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  await db.update(users).set(p.data).where(eq(users.id, user.id));
  refresh();
  return { ok: true };
}
