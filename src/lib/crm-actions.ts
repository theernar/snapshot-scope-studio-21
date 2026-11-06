import { getDB, setDB } from "./crm-store";
import { offlineSaleError } from "./pwa-policy";
import { completeSale, isLocked, nextId, setOrderStatus, validateItem, type OrderStatus, type PaymentMethod, type SaleInput } from "./crm-logic";

export function saveItem(v: { order_id: number; product_id: number; quantity: number; unit_price: number }, id?: number): string | null {
  const d = getDB();
  const err = validateItem(d, v, id);
  if (err) return err;
  setDB({
    ...d,
    order_items: id
      ? d.order_items.map((i) => (i.order_item_id === id ? { ...i, ...v } : i))
      : [...d.order_items, { order_item_id: nextId(d.order_items, "order_item_id"), ...v }],
  });
  return null;
}

export function deleteItem(id: number): string | null {
  const d = getDB();
  const item = d.order_items.find((i) => i.order_item_id === id);
  const order = d.orders.find((o) => o.order_id === item?.order_id);
  if (order && isLocked(order.status)) return `Cannot change items of a ${order.status} order`;
  setDB({ ...d, order_items: d.order_items.filter((i) => i.order_item_id !== id) });
  return null;
}

export function saveOrder(v: { order_date: string; status: OrderStatus; customer_id: number; employee_id: number; payment_method: PaymentMethod | null }, id?: number): string | null {
  const offline = offlineSaleError();
  if (offline) return offline;
  let d = getDB();
  if (!d.customers.some((c) => c.customer_id === v.customer_id)) return "Select an existing customer";
  if (!d.employees.some((e) => e.employee_id === v.employee_id)) return "Select an existing employee";
  const orderId = id ?? nextId(d.orders, "order_id");
  const base = { order_date: v.order_date, customer_id: v.customer_id, employee_id: v.employee_id, payment_method: v.payment_method };
  d = id
    ? { ...d, orders: d.orders.map((o) => (o.order_id === id ? { ...o, ...base } : o)) }
    : { ...d, orders: [...d.orders, { order_id: orderId, status: "New" as const, total_amount: 0, ...base }] };
  const r = setOrderStatus(d, orderId, v.status);
  if ("error" in r) {
    if (!id) return r.error + " (create the order as New, add items, then mark Paid)";
    return r.error;
  }
  setDB(r.db);
  return null;
}

export function deleteOrder(id: number): string | null {
  const offline = offlineSaleError();
  if (offline) return offline;
  let d = getDB();
  const o = d.orders.find((o) => o.order_id === id);
  if (o?.status === "Paid") {
    const r = setOrderStatus(d, id, "Cancelled");
    if ("db" in r) d = r.db;
  }
  setDB({ ...d, orders: d.orders.filter((o) => o.order_id !== id), order_items: d.order_items.filter((i) => i.order_id !== id) });
  return null;
}

export function recordSale(s: SaleInput, editOrderId?: number): string | null {
  const offline = offlineSaleError();
  if (offline) return offline;
  const r = completeSale(getDB(), s, editOrderId);
  if ("error" in r) return r.error;
  setDB(r.db);
  return null;
}

export function changeSaleStatus(orderId: number, status: "Cancelled" | "Refunded"): string | null {
  const offline = offlineSaleError();
  if (offline) return offline;
  const r = setOrderStatus(getDB(), orderId, status);
  if ("error" in r) return r.error;
  setDB(r.db);
  return null;
}
