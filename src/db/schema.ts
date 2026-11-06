import { pgTable, uuid, text, char, numeric, date, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  baseCurrency: char("base_currency", { length: 3 }).notNull().default("INR"),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailOtps = pgTable("email_otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastSentAt: timestamp("last_sent_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ byUser: index("email_otps_user_idx").on(t.userId) }));

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // cash | bank | wallet | card | savings
  currency: char("currency", { length: 3 }).notNull(),
  openingBalance: numeric("opening_balance", { precision: 19, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ byUser: index("accounts_user_idx").on(t.userId) }));

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // income | expense
  color: text("color").notNull().default("#0F766E"),
}, (t) => ({ byUser: index("categories_user_idx").on(t.userId) }));

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  type: text("type").notNull(), // income | expense
  amount: numeric("amount", { precision: 19, scale: 4 }).notNull(), // ORIGINAL amount, never overwritten
  currency: char("currency", { length: 3 }).notNull(), // ORIGINAL currency
  rateToBase: numeric("rate_to_base", { precision: 18, scale: 8 }), // rate used at entry time
  baseCurrency: char("base_currency", { length: 3 }), // base currency at entry time
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull().default(""),
  notes: text("notes").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default("cash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byUserDate: index("tx_user_date_idx").on(t.userId, t.date),
  byAccount: index("tx_account_idx").on(t.accountId),
}));

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromAccountId: uuid("from_account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  toAccountId: uuid("to_account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  amountOut: numeric("amount_out", { precision: 19, scale: 4 }).notNull(),
  amountIn: numeric("amount_in", { precision: 19, scale: 4 }).notNull(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ byUser: index("transfers_user_idx").on(t.userId) }));

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  base: char("base", { length: 3 }).notNull(),
  quote: char("quote", { length: 3 }).notNull(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  rateDate: date("rate_date", { mode: "string" }).notNull(),
  source: text("source").notNull().default("api"),
}, (t) => ({ uniq: uniqueIndex("fx_unique").on(t.base, t.quote, t.rateDate) }));
