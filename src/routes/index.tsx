import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Boxes, Building2, Coins, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useDB } from "@/lib/crm-store";
import { monthStats, finance, inventoryValue, isLowStock, money, orderTotal } from "@/lib/crm-logic";
import { Pill, statusTone } from "@/components/crm/EntityPage";
import { PageHeader } from "@/components/crm/AppShell";
import { SalesChart } from "@/components/crm/SalesChart";
import { Award, CalendarDays, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — Ordo CRM | ERP" },
      { name: "description", content: "Overview of customers, employees, products, orders and inventory value." },
      { property: "og:title", content: "Dashboard — Ordo CRM | ERP" },
      { property: "og:description", content: "Overview of customers, employees, products, orders and inventory value." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const fin = finance(db);
  const month = new Date().toISOString().slice(0, 7);
  const ms = monthStats(db, month);
  const bestEmp = ms.bestSeller && db.employees.find((e) => e.employee_id === ms.bestSeller?.employee_id);
  const topP = ms.products[0];
  const topProd = topP && db.products.find((p) => p.product_id === topP.product_id);
  const stats = [
    { label: "Total Customers", value: db.customers.length, icon: Building2, bg: "pastel-1", to: "/customers" },
    { label: "Total Employees", value: db.employees.length, icon: Users, bg: "pastel-2", to: "/employees" },
    { label: "Total Products", value: db.products.length, icon: Boxes, bg: "pastel-3", to: "/products" },
    { label: "Total Orders", value: db.orders.length, icon: ShoppingCart, bg: "pastel-4", to: "/orders" },
    { label: "Inventory Value", value: money(inventoryValue(db)), icon: Coins, bg: "pastel-5", to: "/products" },
  ] as const;
  const recent = [...db.orders].sort((a, b) => b.order_date.localeCompare(a.order_date) || b.order_id - a.order_id).slice(0, 6);
  const low = db.products.filter(isLowStock);
  const cname = (id: number) => db.customers.find((c) => c.customer_id === id)?.company_name ?? `#${id}`;
  const ename = (id: number) => db.employees.find((e) => e.employee_id === id)?.full_name ?? `#${id}`;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        action={
          <Button asChild variant="lime" size="lg" className="rounded-full">
            <Link to="/sales">+ New sale</Link>
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><span className="pastel-2 grid h-9 w-9 place-items-center rounded-xl"><CalendarDays className="h-4 w-4 text-foreground" /></span>Monthly Revenue</div>
          <p className="truncate text-3xl font-extrabold tracking-tight">{money(ms.revenue)}</p>
          <p className="text-xs text-muted-foreground">{ms.count} paid sales this month</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><span className="pastel-3 grid h-9 w-9 place-items-center rounded-xl"><Award className="h-4 w-4 text-foreground" /></span>Best Seller of the Month</div>
          <p className="truncate text-xl font-extrabold">{bestEmp?.full_name ?? "No sales yet"}</p>
          <p className="text-sm font-semibold text-primary">{ms.bestSeller ? money(ms.bestSeller.amount) : "—"}</p>
        </div>
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
          {topProd?.image_url ? <img src={topProd.image_url} alt={topProd.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : <span className="pastel-4 grid h-20 w-20 shrink-0 place-items-center rounded-2xl"><Package className="h-6 w-6" /></span>}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Top-Selling Product</p>
            <p className="truncate text-lg font-extrabold">{topProd?.name ?? "No sales yet"}</p>
            <p className="text-sm font-semibold text-primary">{topP ? `${topP.qty} sold this month` : "—"}</p>
          </div>
        </div>
      </div>

      <div className="mb-8"><SalesChart db={db} month={month} title="Daily Sales — this month" /></div>

      <section className="mb-8 rounded-3xl border border-border bg-banner p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><TrendingUp className="h-4 w-4" /></span>
          <h2 className="min-w-0 flex-1 truncate font-bold">Total Budget & Revenue</h2>
          <Link to="/sales" className="flex shrink-0 items-center gap-1 text-sm font-medium">Sales <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Total Revenue", money(fin.totalRevenue)],
            ["Today's Sales", `${money(fin.todayRevenue)} · ${fin.todayCount}`],
            ["Monthly Revenue", money(fin.monthRevenue)],
            ["Number of Sales", fin.salesCount],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-2xl bg-card/80 p-4">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{v}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl bg-card/80 p-4 lg:col-span-1">
            <p className="mb-1 text-xs text-muted-foreground">Best-Selling Products</p>
            <ol className="space-y-0.5 text-sm">
              {fin.best.slice(0, 3).map((b, i) => (
                <li key={b.product_id} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {b.name}</span><b className="shrink-0">{b.qty}</b></li>
              ))}
              {fin.best.length === 0 && <li className="text-muted-foreground">No paid sales yet</li>}
            </ol>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group rounded-3xl border border-border bg-card p-3 shadow-soft transition-transform hover:-translate-y-0.5">
            <div className={`${s.bg} grid h-24 place-items-center rounded-2xl`}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-card shadow-soft"><s.icon className="h-5 w-5" /></span>
            </div>
            <div className="px-2 pb-1 pt-3">
              <p className="text-2xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Orders</h2>
            <Link to="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((o) => (
              <div key={o.order_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">#{o.order_id} · {cname(o.customer_id)}</p>
                  <p className="truncate text-muted-foreground">{o.order_date} · {ename(o.employee_id)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Pill tone={statusTone[o.status]}>{o.status}</Pill>
                  <b className="hidden sm:inline">{money(orderTotal(db, o.order_id))}</b>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-bold">Activity & Alerts</h2>
          <ul className="space-y-3 text-sm">
            {low.map((p) => (
              <li key={p.product_id} className="flex items-start gap-3 rounded-2xl bg-warning p-3 text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><b>{p.name}</b> is low on stock ({p.stock_qty} left)</span>
              </li>
            ))}
            {recent.slice(0, 4).map((o) => (
              <li key={o.order_id} className="flex items-start gap-3 rounded-2xl bg-muted p-3">
                <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Order <b>#{o.order_id}</b> for {cname(o.customer_id)} is <b>{o.status}</b></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
