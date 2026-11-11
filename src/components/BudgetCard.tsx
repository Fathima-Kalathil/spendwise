import Link from "next/link";
import Decimal from "decimal.js";
import { budgetStatus, type BudgetLevel } from "@/lib/budget";
import { formatMoney } from "@/lib/format";

export type CatBar = { name: string; color: string; spent: Decimal; limit: Decimal };
const COLORS: Record<BudgetLevel, string> = { ok: "#15803D", warn: "#D97706", danger: "#EA580C", over: "#B42318" };

function Bar({ pct, level, label }: { pct: number; level: BudgetLevel; label: string }) {
  const w = Math.min(pct, 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={w} aria-valuemin={0} aria-valuemax={100} className="h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--line)", boxShadow: "inset 0 2px 4px rgba(0,0,0,.15)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: COLORS[level], boxShadow: "inset 0 1px 0 rgba(255,255,255,.4)" }} />
    </div>
  );
}

export function BudgetCard({ base, spent, limit, cats }: { base: string; spent: Decimal; limit: Decimal | null; cats: CatBar[] }) {
  if (!limit && cats.length === 0) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-semibold">Monthly budget</div><div className="muted text-sm">Set a limit and see how much of it you have used.</div></div>
        <Link href="/budget" className="btn">Set a budget</Link>
      </div>
    );
  }
  const overall = limit ? budgetStatus(spent, limit) : null;
  const note = overall && (overall.level === "over" ? "You are over your monthly budget." : overall.level === "danger" ? `Careful: you have used ${overall.pct}% of your budget.` : overall.level === "warn" ? `You have used ${overall.pct}% of your budget.` : "");
  return (
    <section className="card space-y-3" aria-label="Monthly budget">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Monthly budget</h2><Link href="/budget" className="text-sm font-medium underline" style={{ color: "var(--accent)" }}>Change</Link></div>
      {limit && overall && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-lg font-bold">{formatMoney(spent, base)} <span className="muted text-sm font-normal">of {formatMoney(limit, base)}</span></span><span className="font-semibold" style={{ color: COLORS[overall.level] }}>{overall.pct}%</span></div>
          <Bar pct={overall.pct} level={overall.level} label="Monthly budget used" />
          <div className="muted text-sm">{overall.remaining.gte(0) ? `${formatMoney(overall.remaining, base)} left this month` : `Over budget by ${formatMoney(overall.remaining.abs(), base)}`}</div>
          {note && <p role="status" className="text-sm font-medium" style={{ color: COLORS[overall.level] }}>{note}</p>}
        </div>
      )}
      {cats.length > 0 && (
        <ul className="space-y-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
          {cats.map((c) => { const s = budgetStatus(c.spent, c.limit); return (
            <li key={c.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                <span className="muted">{formatMoney(c.spent, base)} of {formatMoney(c.limit, base)} · <b style={{ color: COLORS[s.level] }}>{s.pct}%</b></span></div>
              <Bar pct={s.pct} level={s.level} label={`${c.name} budget used`} />
            </li>); })}
        </ul>
      )}
    </section>
  );
}
