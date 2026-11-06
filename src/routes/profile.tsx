import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Coins, ShoppingBag, Wallet } from "lucide-react";
import { PageHeader } from "@/components/crm/AppShell";
import { SalesChart } from "@/components/crm/SalesChart";
import { Pill, statusTone } from "@/components/crm/EntityPage";
import { useDB } from "@/lib/crm-store";
import { money, monthStats, orderTotal, SELLER_COMMISSION_RATE } from "@/lib/crm-logic";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My Seller Account — Ordo CRM" },
      { name: "description", content: "Personal seller profile with monthly turnover, sales history and performance." },
      { property: "og:title", content: "My Seller Account — Ordo CRM" },
      { property: "og:description", content: "Personal seller profile with monthly turnover, sales history and performance." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const db = useDB();
  const session = useSession();
  if (!session) return null;
  const eid = session.employee_id;
  const emp = db.employees.find((e) => e.employee_id === eid);
  const month = new Date().toISOString().slice(0, 7);
  const st = monthStats(db, month, eid);
  const earnings = SELLER_COMMISSION_RATE === null ? null : st.revenue * SELLER_COMMISSION_RATE;
  const history = db.orders.filter((o) => o.employee_id === eid).sort((a, b) => b.order_date.localeCompare(a.order_date) || b.order_id - a.order_id);
  const cname = (id: number) => db.customers.find((c) => c.customer_id === id)?.company_name ?? `#${id}`;
  const pname = (id: number) => db.products.find((p) => p.product_id === id);

  const cards = [
    { label: "Seller ID", value: session.seller_id, icon: BadgeCheck, bg: "pastel-1" },
    { label: "Turnover this month", value: money(st.revenue), icon: Coins, bg: "pastel-2" },
    { label: "Completed sales this month", value: st.count, icon: ShoppingBag, bg: "pastel-3" },
    { label: "Monthly earnings", value: earnings === null ? "Not configured" : money(earnings), icon: Wallet, bg: "pastel-4" },
  ];

  return (
    <div>
      <PageHeader title="My account" />
      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-banner p-5 shadow-soft">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-2xl font-extrabold text-accent-foreground">{(emp?.full_name ?? session.full_name)[0]}</span>
        <div className="min-w-0">
          <p className="truncate text-xl font-extrabold">{emp?.full_name ?? session.full_name}</p>
          <p className="break-words text-sm text-muted-foreground">{emp?.position ?? "Seller"} · {emp?.email}</p>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
            <span className={`${c.bg} grid h-12 w-12 shrink-0 place-items-center rounded-2xl`}><c.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
      {earnings === null && <p className="-mt-3 mb-6 text-xs text-muted-foreground">No commission or salary rule is set yet, so only turnover is shown.</p>}

      <SalesChart db={db} month={month} employeeId={eid} title="My performance this month" />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">My sales history</h2>
          <div className="divide-y divide-border">
            {history.length === 0 && <p className="py-3 text-sm text-muted-foreground">No sales yet.</p>}
            {history.slice(0, 15).map((o) => (
              <div key={o.order_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">#{o.order_id} · {cname(o.customer_id)}</p>
                  <p className="text-muted-foreground">{o.order_date} · {o.payment_method ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3"><Pill tone={statusTone[o.status]}>{o.status}</Pill><b className="hidden sm:inline">{money(orderTotal(db, o.order_id))}</b></div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-bold">My best-selling products</h2>
          <ul className="space-y-3">
            {st.products.length === 0 && <li className="text-sm text-muted-foreground">No paid sales this month.</li>}
            {st.products.slice(0, 5).map((p) => {
              const pr = pname(p.product_id);
              return (
                <li key={p.product_id} className="flex items-center gap-3">
                  {pr?.image_url && <img src={pr.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{pr?.name ?? `#${p.product_id}`}</span>
                  <span className="text-right text-xs"><b className="block text-sm">{p.qty} pcs</b>{money(p.revenue)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
