import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/crm/EntityPage";
import { useDB } from "@/lib/crm-store";
import { money, type OrderItem } from "@/lib/crm-logic";
import { deleteItem, saveItem } from "@/lib/crm-actions";

export const Route = createFileRoute("/order-items")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Order Items — Ordo CRM" },
      { name: "description", content: "Line items across all orders with automatic totals." },
      { property: "og:title", content: "Order Items — Ordo CRM" },
      { property: "og:description", content: "Line items across all orders with automatic totals." },
    ],
  }),
  component: OrderItemsPage,
});

function OrderItemsPage() {
  const db = useDB();
  const pname = (id: number) => db.products.find((p) => p.product_id === id)?.name ?? `#${id}`;
  const editable = db.orders.filter((o) => o.status === "New" || o.status === "Processing");
  return (
    <EntityPage<OrderItem>
      title="Order Items"
      singular="Item"
      rows={db.order_items}
      idKey="order_item_id"
      searchText={(i) => `${i.order_item_id} order ${i.order_id} ${pname(i.product_id)}`}
      filter={{
        label: "Order",
        options: db.orders.map((o) => ({ value: String(o.order_id), label: `Order #${o.order_id}` })),
        match: (r, v) => String(r.order_id) === v,
      }}
      columns={[
        { label: "ID", render: (i) => <span className="text-muted-foreground">#{i.order_item_id}</span> },
        { label: "Order", render: (i) => `#${i.order_id}` },
        { label: "Product", render: (i) => <span className="font-semibold">{pname(i.product_id)}</span> },
        { label: "Qty", render: (i) => i.quantity },
        { label: "Unit price", render: (i) => money(i.unit_price) },
        { label: "Line total", render: (i) => <b>{money(i.quantity * i.unit_price)}</b> },
      ]}
      fields={[
        { key: "order_id", label: "Order", type: "select", options: (editable.length ? editable : db.orders).map((o) => ({ value: String(o.order_id), label: `Order #${o.order_id} (${o.status})` })) },
        { key: "product_id", label: "Product", type: "select", options: db.products.map((p) => ({ value: String(p.product_id), label: `${p.name} — ${p.stock_qty} in stock` })) },
        { key: "quantity", label: "Quantity", type: "number", step: "1" },
        { key: "unit_price", label: "Unit price", type: "number", step: "0.01" },
      ]}
      defaults={() => ({ order_id: "", product_id: "", quantity: "1", unit_price: "" })}
      onChange={(f, k) => {
        if (k !== "product_id") return f;
        const p = db.products.find((p) => String(p.product_id) === f.product_id);
        return p ? { ...f, unit_price: String(p.price) } : f;
      }}
      onSave={(v, id) =>
        saveItem({ order_id: Number(v.order_id), product_id: Number(v.product_id), quantity: Number(v.quantity), unit_price: Number(v.unit_price) }, id)
      }
      onDelete={deleteItem}
    />
  );
}
