# SpendWise – multi-currency expense tracker

Track income and expenses in INR, AED, USD, EUR and more. Every transaction keeps its **original amount and currency**, plus the exchange rate used when it was entered. Built with free tools only.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Neon Postgres (free, via Vercel Storage) · Drizzle ORM · JWT cookie auth (jose + bcryptjs) · Recharts · decimal.js · Vitest · Vercel Hobby hosting · free exchange-rate APIs.

## Features
- Register with **email verification (6-digit code)**, login, logout with confirmation (bcrypt password hashing, signed httpOnly JWT cookie, route middleware, every query scoped to the logged-in user)
- Add, edit, delete income and expenses; pick the currency per transaction (AED today, INR tomorrow)
- Live exchange-rate lookup with a manual override; the rate is stored with each transaction
- Accounts / wallets, each with its own currency and balance; cross-currency transfers
- Dashboard: income, expenses, net, per-currency balances, optional total in base currency, 6-month chart, category donut, date filters (today / week / month / last month / year / custom)
- Search and filters (text, type, category, currency, account, date range, min/max amount)
- Base currency changeable in Settings; light and dark themes; responsive (sidebar on desktop, tab bar on mobile)
- Unit tests for decimal math, balances, rate parsing and date ranges

