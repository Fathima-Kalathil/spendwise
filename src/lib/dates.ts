export const iso = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const todayIso = () => iso(new Date());

export type RangeKey = "today" | "week" | "month" | "lastmonth" | "year" | "custom";
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" }, { key: "week", label: "This Week" }, { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" }, { key: "year", label: "This Year" }, { key: "custom", label: "Custom" },
];

export function resolveRange(key: string | undefined, from?: string, to?: string, now = new Date()): { key: RangeKey; from: string; to: string } {
  const y = now.getFullYear(), m = now.getMonth();
  if (key === "today") return { key: "today", from: iso(now), to: iso(now) };
  if (key === "week") {
    const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    return { key: "week", from: iso(start), to: iso(now) };
  }
  if (key === "lastmonth") return { key: "lastmonth", from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
  if (key === "year") return { key: "year", from: iso(new Date(y, 0, 1)), to: iso(now) };
  if (key === "custom" && from && to) return { key: "custom", from, to };
  return { key: "month", from: iso(new Date(y, m, 1)), to: iso(now) };
}

export function lastMonths(n: number, now = new Date()): { label: string; from: string; to: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      from: iso(d),
      to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  });
}
