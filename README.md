# SpendWise – multi-currency expense tracker

Track income and expenses in INR, AED, USD, EUR and more. Every transaction keeps its **original amount and currency**, plus the exchange rate used when it was entered. Built with free tools only.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Neon Postgres (free, via Vercel Storage) · Drizzle ORM · JWT cookie auth (jose + bcryptjs) · Recharts · decimal.js · Vitest · Vercel Hobby hosting · free exchange-rate APIs.

## Features
- Register / login / logout (bcrypt password hashing, signed httpOnly JWT cookie, route middleware, every query scoped to the logged-in user)
- Add, edit, delete income and expenses; pick the currency per transaction (AED today, INR tomorrow)
- Live exchange-rate lookup with a manual override; the rate is stored with each transaction
- Accounts / wallets, each with its own currency and balance; cross-currency transfers
- Dashboard: income, expenses, net, per-currency balances, optional total in base currency, 6-month chart, category donut, date filters (today / week / month / last month / year / custom)
- Search and filters (text, type, category, currency, account, date range, min/max amount)
- Base currency changeable in Settings; light and dark themes; responsive (sidebar on desktop, tab bar on mobile)
- Unit tests for decimal math, balances, rate parsing and date ranges

## Setup (about 15 minutes)
1. Install Node.js 18.18+ (or 20+) and unzip the project.
2. `npm install`
3. Create the free database: on Vercel open **Storage → Create → Neon (Postgres)**, or sign up at neon.tech. Copy the connection string.
4. `cp .env.example .env.local`, then set `DATABASE_URL` and a random `AUTH_SECRET` (`openssl rand -base64 32`).
5. `npm run db:push` creates the tables.
6. (Optional) `npm run db:seed` adds a demo account: `demo@spendwise.app` / `Demo@1234`.
7. `npm run dev` and open http://localhost:3000, then register.
8. `npm test` runs the unit tests; `npm run typecheck` checks types.

## Deploy free on Vercel
1. Push the project to a GitHub repo (`.env.local` is git-ignored).
2. On vercel.com choose **Add New → Project**, import the repo, keep the Next.js defaults.
3. In **Storage**, connect the Neon database to the project (this adds `DATABASE_URL`). Add `AUTH_SECRET` under **Settings → Environment Variables**.
4. Deploy. Run `npm run db:push` once from your computer against the same database (and `db:seed` if you want the demo user for interviews).

## Design decisions (good interview talking points)
- **Money is never a float.** Amounts are `NUMERIC(19,4)` in Postgres and `decimal.js` in code.
- **Originals are immutable.** A transaction stores amount, currency, `rate_to_base` and the base currency at entry; conversion only affects reports.
- **Balances never mix currencies.** Each account has one currency; the "total" card converts at today's rates and says so.
- **Changing the base currency needs no migration:** totals are recomputed using the stored rate (same base) or the cached rate for the transaction date.
- **Missing rates are handled, not guessed:** the form asks for a manual rate, and dashboards show a warning instead of wrong numbers.
- **Rate sources:** DB cache, then free currency-api (CDN + backup host), then open.er-api.com for today's rate. Verify coverage for your currencies; manual entry is always available.
- **Security:** bcrypt, httpOnly + sameSite cookie, JWT verified in middleware and again in every server action, zod validation, all queries filtered by `user_id`.

## Not built yet (v2 ideas)
Budgets with alerts, recurring transactions, CSV/Excel/PDF export, receipt uploads (Vercel Blob), split transactions, notifications, custom categories UI, password change, login rate limiting.

## Deploy without running anything locally
1. Unzip, create an empty GitHub repo (for example `spendwise`) and push the project files (`package-lock.json` included).
2. Vercel: **Add New → Project**, import the repo, keep the defaults. Do not deploy yet if you want to add the database first.
3. Vercel: **Storage → Create → Neon**, connect it to the project (this adds `DATABASE_URL`).
4. Vercel: **Settings → Environment Variables**, add `AUTH_SECRET` (any random 32+ character string). In a browser console, `crypto.randomUUID() + crypto.randomUUID()` gives a good one.
5. In the Neon console open **SQL Editor**, paste `sql/01-schema.sql` and run it. Optionally run `sql/02-demo-data.sql` for the demo user.
6. Vercel: **Deployments → Redeploy** so the new variables are used. Open the live URL and register.
