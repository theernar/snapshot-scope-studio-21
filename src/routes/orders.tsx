import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EntityPage, Pill, selectCls, statusTone } from "@/components/crm/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDB } from "@/lib/crm-store";
import { isLocked, money, orderTotal, ORDER_STATUSES, PAYMENT_METHODS, type PaymentMethod, type Order, type OrderStatus } from "@/lib/crm-logic";
import { deleteItem, deleteOrder, saveItem, saveOrder } from "@/lib/crm-actions";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Orders — Ordo CRM" },
      { name: "description", content: "Create orders, add products, track status and totals." },
      { property: "og:title", content: "Orders — Ordo CRM" },
      { property: "og:description", content: "Create orders, add products, track status and totals." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const db = useDB();
  const [itemsFor, setItemsFor] = useState<number | null>(null);
  const cname = (id: number) => db.customers.find((c) => c.customer_id === id)?.company_name ?? `#${id}`;
  const ename = (id: number) => db.employees.find((e) => e.employee_id === id)?.full_name ?? `#${id}`;
  return (
    <>
      <EntityPage<Order>
        title="Orders"
        singular="Order"
        rows={[...db.orders].sort((a, b) => b.order_id - a.order_id)}
        idKey="order_id"
        searchText={(o) => `${o.order_id} ${o.order_date} ${o.status} ${cname(o.customer_id)} ${ename(o.employee_id)}`}
        filter={{ label: "Status", options: ORDER_STATUSES.map((s) => ({ value: s, label: s })), match: (r, v) => r.status === v }}
        columns={[
          { label: "ID", render: (o) => <span className="text-muted-foreground">#{o.order_id}</span> },
          { label: "Date", render: (o) => o.order_date },
          { label: "Customer", render: (o) => <span className="font-semibold">{cname(o.customer_id)}</span> },
          { label: "Employee", render: (o) => ename(o.employee_id) },
          { label: "Status", render: (o) => <Pill tone={statusTone[o.status]}>{o.status}</Pill> },
          { label: "Items", render: (o) => db.order_items.filter((i) => i.order_id === o.order_id).length },
          { label: "Total", render: (o) => <b>{money(orderTotal(db, o.order_id))}</b> },
        ]}
        fields={[
          { key: "order_date", label: "Order date", type: "date" },
          { key: "status", label: "Status", type: "select", options: ORDER_STATUSES.map((s) => ({ value: s, label: s })) },
          { key: "customer_id", label: "Customer", type: "select", options: db.customers.map((c) => ({ value: String(c.customer_id), label: c.company_name })) },
          { key: "employee_id", label: "Employee", type: "select", options: db.employees.map((e) => ({ value: String(e.employee_id), label: e.full_name })) },
          { key: "payment_method", label: "Payment method", type: "select", options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })) },
        ]}
        defaults={() => ({ order_date: new Date().toISOString().slice(0, 10), status: "New", customer_id: "", employee_id: "", payment_method: "Cash" })}
        onSave={(v, id) =>
          saveOrder({ order_date: v.order_date, status: v.status as OrderStatus, customer_id: Number(v.customer_id), employee_id: Number(v.employee_id), payment_method: (v.payment_method || null) as PaymentMethod | null }, id)
        }
        onDelete={deleteOrder}
        extraActions={(o) => (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setItemsFor(o.order_id)}>
            <ListPlus className="h-4 w-4" /> Items
          </Button>
        )}
      />
      <ItemsDialog orderId={itemsFor} onClose={() => setItemsFor(null)} />
    </>
  );
}

function ItemsDialog({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const db = useDB();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("1");
  const order = db.orders.find((o) => o.order_id === orderId);
  const items = db.order_items.filter((i) => i.order_id === orderId);
  const locked = order ? isLocked(order.status) : false;

  const add = () => {
    if (!order) return;
    const p = db.products.find((p) => String(p.product_id) === pid);
    if (!p) { toast.error("Select a product"); return; }
    const err = saveItem({ order_id: order.order_id, product_id: p.product_id, quantity: Number(qty), unit_price: p.price });
    if (err) { toast.error(err); return; }
    toast.success(`${p.name} added`);
    setPid("");
    setQty("1");
  };

  return (
    <Dialog open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order #{orderId} items {order && <Pill tone={statusTone[order.status]}>{order.status}</Pill>}
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border rounded-2xl border border-border">
          {items.map((i) => {
            const p = db.products.find((p) => p.product_id === i.product_id);
            return (
              <div key={i.order_item_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p?.name ?? `#${i.product_id}`}</p>
                  <p className="text-muted-foreground">{i.quantity} × {money(i.unit_price)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <b>{money(i.quantity * i.unit_price)}</b>
                  {!locked && (
                    <Button size="icon" variant="ghost" className="rounded-full text-destructive" aria-label="Remove item"
                      onClick={() => { const e = deleteItem(i.order_item_id); e ? toast.error(e) : toast.success("Item removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No items yet.</p>}
          <div className="flex justify-between bg-muted/60 px-4 py-3 font-bold">
            <span>Total</span>
            <span>{orderId !== null && money(orderTotal(db, orderId))}</span>
          </div>
        </div>
        {locked ? (
          <p className="text-sm text-muted-foreground">Items are locked for {order?.status} orders.</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className={selectCls} value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Select product…</option>
              {db.products.map((p) => (
                <option key={p.product_id} value={p.product_id}>{p.name} — {money(p.price)} ({p.stock_qty} in stock)</option>
              ))}
            </select>
            <Input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-full sm:w-24" />
            <Button variant="lime" onClick={add}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
