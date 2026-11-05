import { formatMoney } from "@/lib/format";

const TILES: Record<string, string> = { INR: "#D97706,#92400E", AED: "#2563EB,#1E3A8A", USD: "#16A34A,#14532D", EUR: "#7C3AED,#4C1D95", GBP: "#DB2777,#831843" };

export function CurrencyTile({ code }: { code: string }) {
  const g = TILES[code] ?? "#475569,#1E293B";
  let sym = code;
  try { sym = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code; } catch {}
  return <div className="tile" style={{ background: `linear-gradient(145deg,${g})`, fontSize: sym.length > 2 ? 11 : 18 }} aria-hidden="true">{sym}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card card-hover">
      <div className="muted text-xs">{label}</div>
      <div className={`mt-1 text-xl font-bold md:text-2xl ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

export { formatMoney };
