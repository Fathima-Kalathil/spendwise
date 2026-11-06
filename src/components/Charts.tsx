"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

export function IncomeExpenseChart({ data, currency }: { data: { label: string; income: number; expense: number }[]; currency: string }) {
  return (
    <div role="img" aria-label="Income versus expenses for the last 6 months" style={{ height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} barGap={4}>
          <defs>
            <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" /><stop offset="100%" stopColor="#15803D" /></linearGradient>
            <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F87171" /><stop offset="100%" stopColor="#B42318" /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,.35)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          <Legend />
          <Bar dataKey="income" name="Earned" fill="url(#gi)" radius={[8, 8, 2, 2]} />
          <Bar dataKey="expense" name="Spent" fill="url(#ge)" radius={[8, 8, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data, currency }: { data: { name: string; value: number; color: string }[]; currency: string }) {
    return (
    <div className="flex flex-wrap items-center gap-4">
      <div role="img" aria-label="Expenses by category" style={{ width: 170, height: 170 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-1.5 text-sm">
        {data.slice(0, 6).map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: d.color }} />{d.name}</span>
            <span className="muted">{formatMoney(d.value, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
