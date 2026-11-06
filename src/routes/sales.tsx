import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Eye, Pencil, Search, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/AppShell";
import { Pill, selectCls, statusTone } from "@/components/crm/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDB } from "@/lib/crm-store";
import { finance, isLowStock, money, PAYMENT_METHODS, type PaymentMethod } from "@/lib/crm-logic";
import { changeSaleStatus, recordSale } from "@/lib/crm-actions";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sales — Ordo CRM" },
      { name: "description", content: "Register completed sales in KZT and browse sales history." },
      { property: "og:title", content: "Sales — Ordo CRM" },
      { property: "og:description", content: "Register completed sales in KZT and browse sales history." },
    ],
  }),
  component: SalesPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ product_id: "", quantity: "1", customer_id: "", employee_id: "", unit_price: "", payment_method: "Cash", sale_date: today() });

function SalesPage() {
  const db = useDB();
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pm, setPm] = useState("all");

  const product = db.products.find((p) => String(p.product_id) === form.product_id);
  const total = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);
  const fin = finance(db);

  // A sale = an order that has a payment method. One row per order item.
  const rows = useMemo(
    () =>
      db.orders
        .filter((o) => o.payment_method)
        .flatMap((o) =>
          db.order_items
            .filter((i) => i.order_id === o.order_id)
            .map((i) => ({
              o,
              i,
              product: db.products.find((p) => p.product_id === i.product_id)?.name ?? `#${i.product_id}`,
              customer: db.customers.find((c) => c.customer_id === o.customer_id)?.company_name ?? `#${o.customer_id}`,
              seller: db.employees.find((e) => e.employee_id === o.employee_id)?.full_name ?? `#${o.employee_id}`,
            })),
        )
        .sort((a, b) => b.o.order_date.localeCompare(a.o.order_date) || b.o.order_id - a.o.order_id),
    [db],
  );
  const visible = rows.filter(
    (r) =>
      `${r.o.order_id} ${r.product} ${r.customer} ${r.seller} ${r.o.status}`.toLowerCase().includes(q.trim().toLowerCase()) &&
      (!from || r.o.order_date >= from) &&
      (!to || r.o.order_date <= to) &&
      (pm === "all" || r.o.payment_method === pm),
  );

  const set = (k: keyof ReturnType<typeof empty>, v: string) =>
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (k === "product_id") {
        const p = db.products.find((p) => String(p.product_id) === v);
        if (p) n.unit_price = String(p.price);
      }
      return n;
    });

  const submit = () => {
    const err = recordSale(
      {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        customer_id: Number(form.customer_id),
        employee_id: Number(form.employee_id),
        unit_price: Number(form.unit_price),
        payment_method: form.payment_method as PaymentMethod,
        sale_date: form.sale_date || today(),
      },
      editId ?? undefined,
    );
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(editId ? `Sale #${editId} updated` : "Sale completed", { description: `${form.quantity} × ${product?.name} — ${money(total)}` });
    setEditId(null);
    setForm((f) => ({ ...empty(), employee_id: f.employee_id }));
  };

  const startEdit = (id: number) => {
    const o = db.orders.find((o) => o.order_id === id);
    const i = db.order_items.find((i) => i.order_id === id);
    if (!o || !i) return;
    setEditId(id);
    setForm({
      product_id: String(i.product_id), quantity: String(i.quantity), customer_id: String(o.customer_id), employee_id: String(o.employee_id),
      unit_price: String(i.unit_price), payment_method: o.payment_method ?? "Cash", sale_date: o.order_date,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = (id: number, s: "Cancelled" | "Refunded") => {
    if (!confirm(`${s === "Cancelled" ? "Cancel" : "Refund"} sale #${id}? Stock will be restored.`)) return;
    const err = changeSaleStatus(id, s);
    if (err) toast.error(err);
    else toast.success(`Sale #${id} ${s.toLowerCase()} — stock restored`);
  };

  const viewed = rows.find((r) => r.o.order_id === view);

  return (
    <div>
      <PageHeader title="Sales" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue", value: money(fin.totalRevenue), bg: "pastel-3" },
          { label: "Today's sales", value: `${money(fin.todayRevenue)}`, sub: `${fin.todayCount} sales`, bg: "pastel-1" },
          { label: "This month", value: money(fin.monthRevenue), bg: "pastel-5" },
          { label: "Paid sales", value: fin.salesCount, bg: "pastel-2" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-3xl p-4 shadow-soft`}>
            <p className="text-xs font-medium text-foreground/70">{s.label}</p>
            <p className="mt-1 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{s.value}</p>
            {s.sub && <p className="text-xs text-foreground/70">{s.sub}</p>}
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{editId ? `Edit sale #${editId}` : "Register a sale"}</h2>
          {editId && (
            <Button variant="ghost" size="sm" onClick={() => { setEditId(null); setForm(empty()); }}><X className="h-4 w-4" /> Cancel edit</Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <F label="Product">
            <select className={selectCls} value={form.product_id} onChange={(e) => set("product_id", e.target.value)}>
              <option value="">Select product…</option>
              {db.products.map((p) => (
                <option key={p.product_id} value={p.product_id} disabled={p.stock_qty === 0}>
                  {p.name} — {p.stock_qty} in stock
                </option>
              ))}
            </select>
            {product && (
              <span className={`text-xs ${isLowStock(product) ? "text-warning-foreground" : "text-muted-foreground"}`}>
                {product.stock_qty} available{isLowStock(product) ? " · low stock" : ""}
              </span>
            )}
          </F>
          <F label="Quantity sold">
            <Input type="number" min={1} step={1} className="rounded-full" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </F>
          <F label="Customer">
            <select className={selectCls} value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">Select customer…</option>
              {db.customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.company_name}</option>)}
            </select>
          </F>
          <F label="Seller">
            <select className={selectCls} value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)}>
              <option value="">Select seller…</option>
              {db.employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
            </select>
          </F>
          <F label="Selling price (₸ per unit)">
            <Input type="number" min={0} step={1} className="rounded-full" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
          </F>
          <F label="Payment method">
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m} type="button" onClick={() => set("payment_method", m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${form.payment_method === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                  {m}
                </button>
              ))}
            </div>
          </F>
          <F label="Sale date">
            <Input type="date" className="rounded-full" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} />
          </F>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-baseline justify-between rounded-2xl bg-banner px-4 py-2">
              <span className="text-xs font-medium">Total</span>
              <span className="text-lg font-extrabold">{money(total)}</span>
            </div>
          </div>
        </div>
        <Button variant="lime" size="lg" className="mt-5 w-full sm:w-auto" onClick={submit}>
          <CheckCircle2 className="h-4 w-4" /> {editId ? "Save changes" : "Complete Sale"}
        </Button>
      </section>

      <h2 className="mb-3 text-lg font-bold">Sales history</h2>
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, customer, seller…" className="h-10 rounded-full bg-card pl-10" />
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-full bg-card" aria-label="From date" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-full bg-card" aria-label="To date" />
        </div>
        <select className={selectCls + " h-10 md:w-44"} value={pm} onChange={(e) => setPm(e.target.value)} aria-label="Payment method filter">
          <option value="all">All payment methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                {["Sale ID", "Date", "Product", "Qty", "Customer", "Seller", "Unit price", "Total", "Payment", "Status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.i.order_item_id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-muted-foreground">#{r.o.order_id}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.o.order_date}</td>
                  <td className="px-4 py-3 font-semibold">{r.product}</td>
                  <td className="px-4 py-3">{r.i.quantity}</td>
                  <td className="px-4 py-3">{r.customer}</td>
                  <td className="px-4 py-3">{r.seller}</td>
                  <td className="whitespace-nowrap px-4 py-3">{money(r.i.unit_price)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold">{money(r.i.quantity * r.i.unit_price)}</td>
                  <td className="px-4 py-3"><Pill>{r.o.payment_method}</Pill></td>
                  <td className="px-4 py-3"><Pill tone={statusTone[r.o.status]}>{r.o.status}</Pill></td>
                  <td className="px-4 py-3"><Actions status={r.o.status} onView={() => setView(r.o.order_id)} onEdit={() => startEdit(r.o.order_id)} onStatus={(s) => changeStatus(r.o.order_id, s)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border lg:hidden">
          {visible.map((r) => (
            <div key={r.i.order_item_id} className="space-y-1.5 p-4 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate font-semibold">#{r.o.order_id} · {r.product} × {r.i.quantity}</p>
                <Pill tone={statusTone[r.o.status]}>{r.o.status}</Pill>
              </div>
              <p className="truncate text-muted-foreground">{r.o.order_date} · {r.customer} · {r.seller}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{money(r.i.quantity * r.i.unit_price)}</b> <span className="text-muted-foreground">· {r.o.payment_method}</span></span>
                <Actions status={r.o.status} onView={() => setView(r.o.order_id)} onEdit={() => startEdit(r.o.order_id)} onStatus={(s) => changeStatus(r.o.order_id, s)} />
              </div>
            </div>
          ))}
        </div>
        {visible.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No sales found.</p>}
      </div>

      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Sale #{view}</DialogTitle></DialogHeader>
          {viewed && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Date", viewed.o.order_date], ["Status", viewed.o.status], ["Product", viewed.product], ["Quantity", viewed.i.quantity],
                ["Customer", viewed.customer], ["Seller", viewed.seller], ["Unit price", money(viewed.i.unit_price)],
                ["Payment", viewed.o.payment_method], ["Total amount", money(viewed.o.total_amount)],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid content-start gap-1.5"><Label>{label}</Label>{children}</div>;
}

function Actions({ status, onView, onEdit, onStatus }: { status: string; onView: () => void; onEdit: () => void; onStatus: (s: "Cancelled" | "Refunded") => void }) {
  const paid = status === "Paid";
  return (
    <div className="flex justify-end gap-0.5">
      <Button size="icon" variant="ghost" className="rounded-full" aria-label="View" onClick={onView}><Eye className="h-4 w-4" /></Button>
      {paid && (
        <>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Refund" title="Refund" onClick={() => onStatus("Refunded")}><Undo2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="rounded-full text-destructive hover:text-destructive" aria-label="Cancel sale" title="Cancel" onClick={() => onStatus("Cancelled")}><Ban className="h-4 w-4" /></Button>
        </>
      )}
    </div>
  );
}
