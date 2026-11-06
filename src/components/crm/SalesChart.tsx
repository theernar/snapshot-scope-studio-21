import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dailySeries, money, orderTotal, type DB } from "@/lib/crm-logic";

type View = "daily" | "weekly" | "monthly";

export function SalesChart({ db, month, employeeId, title = "Sales Revenue" }: { db: DB; month: string; employeeId?: number; title?: string }) {
  const [view, setView] = useState<View>("daily");
  const data = useMemo(() => {
    if (view === "daily") return dailySeries(db, month, employeeId).map((d) => ({ label: String(d.day), tip: d.date, amount: d.amount }));
    if (view === "weekly") {
      const days = dailySeries(db, month, employeeId);
      const weeks: { label: string; tip: string; amount: number }[] = [];
      for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weeks.push({ label: `W${weeks.length + 1}`, tip: `${chunk[0]?.date ?? ""} – ${chunk[chunk.length - 1]?.date ?? ""}`, amount: chunk.reduce((s, d) => s + d.amount, 0) });
      }
      return weeks;
    }
    const y = Number(month.slice(0, 4));
    return Array.from({ length: 12 }, (_, i) => {
      const m = `${y}-${String(i + 1).padStart(2, "0")}`;
      const amount = db.orders
        .filter((o) => o.status === "Paid" && o.order_date.startsWith(m) && (employeeId === undefined || o.employee_id === employeeId))
        .reduce((s, o) => s + orderTotal(db, o.order_id), 0);
      return { label: new Date(y, i, 1).toLocaleString("en", { month: "short" }), tip: m, amount };
    });
  }, [db, month, employeeId, view]);

  const withDelta = data.map((d, i) => ({ ...d, delta: i === 0 ? 0 : d.amount - (data[i - 1]?.amount ?? 0) }));

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex rounded-full border border-border bg-muted p-1 text-sm">
          {(["daily", "weekly", "monthly"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 font-medium capitalize ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={withDelta} margin={{ left: 8, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} stroke="var(--color-muted-foreground)" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v)} />
            <Tooltip
              cursor={{ stroke: "var(--color-border)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as (typeof withDelta)[number] | undefined;
                if (!p) return null;
                return (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-soft">
                    <p className="text-muted-foreground">{p.tip}</p>
                    <p className="font-bold">{money(p.amount)}</p>
                    {p.delta !== 0 && <p className={p.delta > 0 ? "text-success" : "text-destructive"}>{p.delta > 0 ? "▲" : "▼"} {money(Math.abs(p.delta))}</p>}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="amount" stroke="none" fill="url(#salesFill)" />
            <Line
              type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2.5}
              dot={(props: { cx?: number; cy?: number; index?: number; payload?: { delta: number } }) => (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={3.5} strokeWidth={2} stroke="var(--color-card)"
                  fill={!props.payload || props.payload.delta === 0 ? "var(--color-primary)" : props.payload.delta > 0 ? "var(--color-success)" : "var(--color-destructive)"} />
              )}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Green points: increase vs. previous period · red: decrease.</p>
    </section>
  );
}
