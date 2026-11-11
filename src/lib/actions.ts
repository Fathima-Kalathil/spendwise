"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, budgets, categories, emailOtps, transactions, transfers, users } from "@/db/schema";
import { createSession, destroySession, requireUser } from "./auth";
import { clearLoginFailures, clientIp, loginRetryAfter, recordLoginFailure } from "./loginGuard";
import { getRate } from "./fx";
import { D, isValidAmount, isValidRate } from "./money";
import { ACCOUNT_TYPES, CURRENCY_CODES, PAYMENT_METHODS } from "./currencies";
import { DEFAULT_CATEGORIES } from "./defaults";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_MS, OTP_TTL_MS, generateOtp, hashOtp, isExpired, otpMatches, otpSecret } from "./otp";
import { sendOtpEmail } from "./mail";

export type ActionState = { error?: string; ok?: boolean };
const refresh = () => revalidatePath("/", "layout");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

// ---------------------------------------------------------------- auth
type Purpose = "verify" | "reset";

async function seedDefaults(userId: string) {
  const has = await db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId)).limit(1);
  if (has.length) return;
  await db.insert(categories).values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));
  await db.insert(accounts).values([
    { userId, name: "Cash – INR", type: "cash", currency: "INR" },
    { userId, name: "Wallet – AED", type: "wallet", currency: "AED" },
  ]);
}

/** Creates a fresh 6-digit code, stores only its hash, and emails it. */
async function issueOtp(userId: string, email: string, purpose: Purpose = "verify"): Promise<"sent" | "cooldown" | "failed"> {
  const mine = and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, purpose));
  const [last] = await db.select().from(emailOtps).where(mine).orderBy(desc(emailOtps.createdAt)).limit(1);
  if (last && Date.now() - last.lastSentAt.getTime() < OTP_RESEND_MS) return "cooldown";
  const code = generateOtp();
  await db.delete(emailOtps).where(mine);
  await db.insert(emailOtps).values({ userId, purpose, codeHash: hashOtp(code, email, otpSecret()), expiresAt: new Date(Date.now() + OTP_TTL_MS), lastSentAt: new Date() });
  try {
    await sendOtpEmail(email, code, purpose);
    return "sent";
  } catch (e) {
    console.error("Could not send email:", e);
    await db.delete(emailOtps).where(mine);
    return "failed";
  }
}

/** Checks a code (used by e-mail verification and password reset). Returns an error text, or null when the code is right. */
async function checkOtp(userId: string, email: string, code: string, purpose: Purpose): Promise<string | null> {
  const [otp] = await db.select().from(emailOtps).where(and(eq(emailOtps.userId, userId), eq(emailOtps.purpose, purpose))).orderBy(desc(emailOtps.createdAt)).limit(1);
  if (!otp || isExpired(otp.expiresAt)) return "This code has expired. Tap “Send a new code”.";
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return "Too many wrong tries. Tap “Send a new code”.";
  if (!otpMatches(code, email, otpSecret(), otp.codeHash)) {
    await db.update(emailOtps).set({ attempts: otp.attempts + 1 }).where(eq(emailOtps.id, otp.id));
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return left > 0 ? `That code isn’t right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Tap “Send a new code”.";
  }
  return null;
}

const SEND_FAILED = "We couldn’t send the email. Please try again in a moment.";
const waitText = (ms: number) => `Too many attempts. Please try again in ${Math.max(1, Math.ceil(ms / 60000))} minute(s).`;

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({
    name: z.string().trim().min(2, "Enter your name.").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(100),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };

  const [existing] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  if (existing?.emailVerifiedAt) return { error: "An account with this email already exists. Try logging in." };

  const passwordHash = await bcrypt.hash(p.data.password, 10);
  let userId: string;
  if (existing) {
    await db.update(users).set({ name: p.data.name, passwordHash }).where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    [{ id: userId }] = await db.insert(users).values({ name: p.data.name, email: p.data.email, passwordHash }).returning({ id: users.id });
  }
  if ((await issueOtp(userId, p.data.email)) === "failed") return { error: SEND_FAILED };
  redirect(`/verify?email=${encodeURIComponent(p.data.email)}`);
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter your email and password." };

  // Rate limit: too many wrong passwords for this email (or from this network) -> wait.
  const ip = clientIp();
  const wait = await loginRetryAfter(p.data.email, ip);
  if (wait > 0) return { error: waitText(wait) };

  const [u] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  const ok = u ? await bcrypt.compare(p.data.password, u.passwordHash) : false;
  if (!u || !ok) {
    await recordLoginFailure(p.data.email, ip); // counted even for unknown emails, so attackers learn nothing
    return { error: "Incorrect email or password." };
  }
  await clearLoginFailures(p.data.email);
  if (!u.emailVerifiedAt) {
    if ((await issueOtp(u.id, u.email)) === "failed") return { error: SEND_FAILED };
    redirect(`/verify?email=${encodeURIComponent(u.email)}`);
  }
  await createSession(u.id, u.sessionVersion);
  redirect("/dashboard");
}

export async function verifyOtpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email.") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const [u] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  if (!u) return { error: "We couldn’t find this account. Please register again." };
  if (u.emailVerifiedAt) redirect("/login");

  const err = await checkOtp(u.id, u.email, p.data.code, "verify");
  if (err) return { error: err };

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, u.id));
  await db.delete(emailOtps).where(eq(emailOtps.userId, u.id));
  await seedDefaults(u.id);
  await createSession(u.id, u.sessionVersion);
  redirect("/dashboard");
}

export async function resendOtpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const purpose: Purpose = fd.get("purpose") === "reset" ? "reset" : "verify";
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same answer for unknown emails, so nothing is revealed about who has an account.
  if (!u || (purpose === "verify" && u.emailVerifiedAt) || (purpose === "reset" && !u.emailVerifiedAt)) return { ok: true };
  const r = await issueOtp(u.id, u.email, purpose);
  if (r === "cooldown") return { error: "Please wait a minute before asking for another code." };
  if (r === "failed") return { error: SEND_FAILED };
  return { ok: true };
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const [u] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  if (u?.emailVerifiedAt) await issueOtp(u.id, u.email, "reset");
  redirect(`/reset-password?email=${encodeURIComponent(p.data.email)}`); // same next step whether or not the account exists
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = z.object({
    email: z.string().trim().toLowerCase().email(),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(100),
    confirm: z.string(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  if (p.data.password !== p.data.confirm) return { error: "The two passwords don’t match." };

  const [u] = await db.select().from(users).where(eq(users.email, p.data.email)).limit(1);
  if (!u || !u.emailVerifiedAt) return { error: "This code isn’t valid. Tap “Send a new code”." };
  const err = await checkOtp(u.id, u.email, p.data.code, "reset");
  if (err) return { error: err };

  const passwordHash = await bcrypt.hash(p.data.password, 10);
  await db.update(users).set({ passwordHash, sessionVersion: u.sessionVersion + 1 }).where(eq(users.id, u.id)); // logs out all devices
  await db.delete(emailOtps).where(eq(emailOtps.userId, u.id));
  await clearLoginFailures(u.email);
  redirect("/login?reset=1");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({
    current: z.string().min(1, "Enter your current password."),
    password: z.string().min(8, "New password must be at least 8 characters.").max(100),
    confirm: z.string(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  if (p.data.password !== p.data.confirm) return { error: "The two new passwords don’t match." };

  const key = `pw:${user.email}`, ip = clientIp();
  const wait = await loginRetryAfter(key, ip);
  if (wait > 0) return { error: waitText(wait) };
  if (!(await bcrypt.compare(p.data.current, user.passwordHash))) {
    await recordLoginFailure(key, ip);
    return { error: "Your current password is wrong." };
  }
  if (p.data.password === p.data.current) return { error: "Choose a password that is different from the current one." };

  const sv = user.sessionVersion + 1;
  await db.update(users).set({ passwordHash: await bcrypt.hash(p.data.password, 10), sessionVersion: sv }).where(eq(users.id, user.id));
  await createSession(user.id, sv); // keep THIS device logged in; others are logged out
  await clearLoginFailures(key);
  return { ok: true };
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
    accountId: z.string().uuid().optional().or(z.literal("")),
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

  // The wallet is picked automatically: use the user's wallet in this currency, or create one.
  let acc: typeof accounts.$inferSelect | undefined;
  if (v.accountId) {
    [acc] = await db.select().from(accounts).where(and(eq(accounts.id, v.accountId), eq(accounts.userId, user.id))).limit(1);
    if (!acc) return { error: "Wallet not found." };
    if (acc.currency.trim() !== v.currency) return { error: `This wallet uses ${acc.currency.trim()}. Pick a wallet in ${v.currency}.` };
  } else {
    if (!CURRENCY_CODES.includes(v.currency)) return { error: "Choose a currency." };
    [acc] = await db.select().from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.currency, v.currency))).orderBy(asc(accounts.createdAt)).limit(1);
    if (!acc) [acc] = await db.insert(accounts).values({ userId: user.id, name: `Cash – ${v.currency}`, type: "cash", currency: v.currency }).returning();
  }

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
    type: v.type, accountId: acc!.id, categoryId: v.categoryId || null, amount: v.amount, currency: v.currency,
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

// ---------------------------------------------------------------- categories
const colour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a colour.").default("#0F766E");
const catName = z.string().trim().min(1, "Give the category a name.").max(30, "Keep the name under 30 characters.");

export async function addCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({ name: catName, type: z.enum(["expense", "income"]), color: colour }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const same = await db.select().from(categories).where(and(eq(categories.userId, user.id), eq(categories.type, p.data.type)));
  if (same.length >= 40) return { error: "You can have up to 40 categories of each kind." };
  if (same.some((c) => c.name.toLowerCase() === p.data.name.toLowerCase())) return { error: "You already have a category with this name." };
  await db.insert(categories).values({ userId: user.id, ...p.data });
  refresh();
  return { ok: true };
}

export async function updateCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = z.object({ id: z.string().uuid(), name: catName, color: colour }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const [cat] = await db.select().from(categories).where(and(eq(categories.id, p.data.id), eq(categories.userId, user.id))).limit(1);
  if (!cat) return { error: "Category not found." };
  const same = await db.select().from(categories).where(and(eq(categories.userId, user.id), eq(categories.type, cat.type)));
  if (same.some((c) => c.id !== cat.id && c.name.toLowerCase() === p.data.name.toLowerCase())) return { error: "You already have a category with this name." };
  await db.update(categories).set({ name: p.data.name, color: p.data.color }).where(eq(categories.id, cat.id));
  refresh();
  return { ok: true };
}

/** Items in a deleted category stay; they just show "No category". */
export async function deleteCategory(id: string) {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return;
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  refresh();
}

// ---------------------------------------------------------------- budgets
export async function saveBudgets(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const mine = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.userId, user.id), eq(categories.type, "expense")));
  const valid = new Set(mine.map((c) => c.id));
  const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/,/g, "");

  const rows: { userId: string; categoryId: string | null; amount: string }[] = [];
  const overall = clean(fd.get("overall"));
  if (overall) {
    if (!isValidAmount(overall)) return { error: "The monthly budget must be a number above 0." };
    rows.push({ userId: user.id, categoryId: null, amount: overall });
  }
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("cat_")) continue;
    const id = key.slice(4), amount = clean(value);
    if (!amount || !valid.has(id)) continue;
    if (!isValidAmount(amount)) return { error: "Category limits must be numbers above 0." };
    rows.push({ userId: user.id, categoryId: id, amount });
  }
  await db.delete(budgets).where(eq(budgets.userId, user.id));
  if (rows.length) await db.insert(budgets).values(rows);
  refresh();
  return { ok: true };
}
