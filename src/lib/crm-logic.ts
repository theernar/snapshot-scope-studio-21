export type Customer = { customer_id: number; company_name: string; email: string; city: string };
export type Employee = { employee_id: number; full_name: string; position: string; email: string; seller_code?: string };
export type Product = {
  product_id: number;
  name: string;
  category: string;
  price: number;
  stock_qty: number;
  image_url: string;
  supplier_name: string;
  cost_price: number;
  description: string;
};
export type OrderStatus = "New" | "Processing" | "Paid" | "Cancelled" | "Refunded";
export const ORDER_STATUSES: OrderStatus[] = ["New", "Processing", "Paid", "Cancelled", "Refunded"];
export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "Kaspi";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Card", "Bank Transfer", "Kaspi"];
export type Order = {
  order_id: number;
  order_date: string;
  status: OrderStatus;
  customer_id: number;
  employee_id: number;
  payment_method: PaymentMethod | null;
  total_amount: number;
};
export type OrderItem = { order_item_id: number; order_id: number; product_id: number; quantity: number; unit_price: number };

export type DB = {
  customers: Customer[];
  employees: Employee[];
  products: Product[];
  orders: Order[];
  order_items: OrderItem[];
  defects: Defect[];
};

export type Defect = {
  defect_id: number;
  product_id: number;
  quantity: number;
  reason: string;
  cost_price: number;
  employee_id: number;
  reported_date: string;
};

export const defectLoss = (d: Defect) => d.quantity * d.cost_price;

/** Registers defective units: removes them from sellable stock, loss = purchase price × quantity. */
export function registerDefect(db: DB, v: Omit<Defect, "defect_id" | "cost_price">): { db: DB } | { error: string } {
  const p = db.products.find((p) => p.product_id === v.product_id);
  if (!p) return { error: "Select a product" };
  if (!db.employees.some((e) => e.employee_id === v.employee_id)) return { error: "Select the employee who registered it" };
  if (!Number.isInteger(v.quantity) || v.quantity <= 0) return { error: "Quantity must be a positive whole number" };
  if (v.quantity > p.stock_qty) return { error: `Only ${p.stock_qty} of "${p.name}" in stock` };
  if (!v.reason.trim()) return { error: "Enter the reason for damage" };
  const d: Defect = { ...v, reason: v.reason.trim(), cost_price: p.cost_price, defect_id: nextId(db.defects, "defect_id") };
  return {
    db: { ...db, defects: [...db.defects, d], products: db.products.map((x) => (x.product_id === p.product_id ? { ...x, stock_qty: x.stock_qty - v.quantity } : x)) },
  };
}

/** Deletes a defect record and returns its units to stock. */
export function removeDefect(db: DB, id: number): DB {
  const d = db.defects.find((x) => x.defect_id === id);
  if (!d) return db;
  return { ...db, defects: db.defects.filter((x) => x.defect_id !== id), products: db.products.map((p) => (p.product_id === d.product_id ? { ...p, stock_qty: p.stock_qty + d.quantity } : p)) };
}

/** Monthly stats from Paid orders; optional employee filter. */
export function monthStats(db: DB, month: string, employeeId?: number) {
  const paid = db.orders.filter((o) => o.status === "Paid" && o.order_date.slice(0, 7) === month && (employeeId === undefined || o.employee_id === employeeId));
  const ids = new Set(paid.map((o) => o.order_id));
  const revenue = paid.reduce((t, o) => t + orderTotal(db, o.order_id), 0);
  const byEmp = new Map<number, number>();
  for (const o of paid) byEmp.set(o.employee_id, (byEmp.get(o.employee_id) ?? 0) + orderTotal(db, o.order_id));
  const prod = new Map<number, { qty: number; revenue: number }>();
  for (const i of db.order_items) {
    if (!ids.has(i.order_id)) continue;
    const c = prod.get(i.product_id) ?? { qty: 0, revenue: 0 };
    prod.set(i.product_id, { qty: c.qty + i.quantity, revenue: c.revenue + i.quantity * i.unit_price });
  }
  const topEmp = [...byEmp.entries()].sort((a, b) => b[1] - a[1])[0];
  const products = [...prod.entries()].map(([product_id, v]) => ({ product_id, ...v })).sort((a, b) => b.qty - a.qty);
  return { paid, revenue, count: paid.length, bestSeller: topEmp ? { employee_id: topEmp[0], amount: topEmp[1] } : null, products };
}

/** Revenue per day of the month (1..daysInMonth). */
export function dailySeries(db: DB, month: string, employeeId?: number) {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const out = Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, "0")}`, day: i + 1, amount: 0 }));
  for (const o of monthStats(db, month, employeeId).paid) {
    const day = out[Number(o.order_date.slice(8, 10)) - 1];
    if (day) day.amount += orderTotal(db, o.order_id);
  }
  return out;
}

/** Commission rate for seller earnings. null = not configured (earnings are not shown). */
export const SELLER_COMMISSION_RATE: number | null = null;

export const LOW_STOCK_THRESHOLD = 10;

export const orderTotal = (db: DB, orderId: number) =>
  db.order_items.filter((i) => i.order_id === orderId).reduce((s, i) => s + i.quantity * i.unit_price, 0);

export const inventoryValue = (db: DB) => db.products.reduce((s, p) => s + p.price * p.stock_qty, 0);

export const isLowStock = (p: Product) => p.stock_qty < LOW_STOCK_THRESHOLD;

/** Quantity per product required by an order. */
const needs = (db: DB, orderId: number) => {
  const m = new Map<number, number>();
  for (const i of db.order_items.filter((i) => i.order_id === orderId))
    m.set(i.product_id, (m.get(i.product_id) ?? 0) + i.quantity);
  return m;
};

/** Returns an error message if stock can't cover the order, else null. */
export function checkStock(db: DB, orderId: number): string | null {
  for (const [pid, qty] of needs(db, orderId)) {
    const p = db.products.find((p) => p.product_id === pid);
    if (!p) return `Product #${pid} no longer exists`;
    if (p.stock_qty < qty) return `Insufficient stock for "${p.name}": need ${qty}, have ${p.stock_qty}`;
  }
  return null;
}

/** Changes order status. Deducts stock when becoming Paid, restores it when leaving Paid. */
export function setOrderStatus(db: DB, orderId: number, status: OrderStatus): { db: DB } | { error: string } {
  const order = db.orders.find((o) => o.order_id === orderId);
  if (!order) return { error: "Order not found" };
  const wasPaid = order.status === "Paid";
  const willPay = status === "Paid";
  let products = db.products;
  if (willPay && !wasPaid) {
    if (!db.order_items.some((i) => i.order_id === orderId)) return { error: "Add at least one product before marking as Paid" };
    const err = checkStock(db, orderId);
    if (err) return { error: err };
    const n = needs(db, orderId);
    products = products.map((p) => (n.has(p.product_id) ? { ...p, stock_qty: p.stock_qty - n.get(p.product_id)! } : p));
  } else if (wasPaid && !willPay) {
    const n = needs(db, orderId);
    products = products.map((p) => (n.has(p.product_id) ? { ...p, stock_qty: p.stock_qty + n.get(p.product_id)! } : p));
  }
  return {
    db: { ...db, products, orders: db.orders.map((o) => (o.order_id === orderId ? { ...o, status } : o)) },
  };
}

/** Validates adding/editing an order item against current stock. */
export function validateItem(db: DB, item: Omit<OrderItem, "order_item_id">, editingId?: number): string | null {
  const order = db.orders.find((o) => o.order_id === item.order_id);
  if (!order) return "Select an existing order";
  if (isLocked(order.status)) return `Cannot change items of a ${order.status} order`;
  const p = db.products.find((p) => p.product_id === item.product_id);
  if (!p) return "Select an existing product";
  if (!(item.quantity > 0) || !Number.isInteger(item.quantity)) return "Quantity must be a positive whole number";
  if (!(item.unit_price >= 0)) return "Unit price must be 0 or more";
  const already = db.order_items
    .filter((i) => i.order_id === item.order_id && i.product_id === item.product_id && i.order_item_id !== editingId)
    .reduce((s, i) => s + i.quantity, 0);
  if (already + item.quantity > p.stock_qty)
    return `Insufficient stock for "${p.name}": only ${p.stock_qty} available`;
  return null;
}

export const nextId = <T,>(rows: T[], key: keyof T) =>
  rows.reduce((m, r) => Math.max(m, Number(r[key])), 0) + 1;

export const money = (n: number) =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n)} ₸`;

/** Recomputes the stored total_amount of every order from its items. */
export const withTotals = (db: DB): DB => ({
  ...db,
  defects: db.defects ?? [],
  orders: db.orders.map((o) => ({ ...o, payment_method: o.payment_method ?? null, total_amount: orderTotal(db, o.order_id) })),
});

const LOCKED: OrderStatus[] = ["Paid", "Cancelled", "Refunded"];
export const isLocked = (s: OrderStatus) => LOCKED.includes(s);

export type SaleInput = {
  product_id: number;
  quantity: number;
  customer_id: number;
  employee_id: number;
  unit_price: number;
  payment_method: PaymentMethod;
  sale_date: string;
};

/** Registers a completed sale as a Paid order with one item; deducts stock. */
export function completeSale(db: DB, s: SaleInput, editOrderId?: number): { db: DB; order_id: number } | { error: string } {
  if (!db.customers.some((c) => c.customer_id === s.customer_id)) return { error: "Select an existing customer" };
  if (!db.employees.some((e) => e.employee_id === s.employee_id)) return { error: "Select a seller" };
  const p = db.products.find((p) => p.product_id === s.product_id);
  if (!p) return { error: "Select a product" };
  if (!Number.isInteger(s.quantity) || s.quantity <= 0) return { error: "Quantity must be a positive whole number" };
  if (!(s.unit_price > 0)) return { error: "Selling price must be greater than 0" };
  if (!PAYMENT_METHODS.includes(s.payment_method)) return { error: "Select a payment method" };

  let base = db;
  if (editOrderId !== undefined) {
    const old = db.orders.find((o) => o.order_id === editOrderId);
    if (!old) return { error: "Sale not found" };
    if (old.status !== "Paid") return { error: `Cannot edit a ${old.status.toLowerCase()} sale` };
    const r = setOrderStatus(db, editOrderId, "Cancelled"); // temporarily restore stock
    if ("error" in r) return r;
    base = { ...r.db, order_items: r.db.order_items.filter((i) => i.order_id !== editOrderId), orders: r.db.orders.filter((o) => o.order_id !== editOrderId) };
  }
  const prod = base.products.find((x) => x.product_id === s.product_id)!;
  if (prod.stock_qty < s.quantity) return { error: `Insufficient stock for "${prod.name}": only ${prod.stock_qty} available` };

  const order_id = editOrderId ?? nextId(db.orders, "order_id");
  const order: Order = {
    order_id, order_date: s.sale_date, status: "New", customer_id: s.customer_id, employee_id: s.employee_id,
    payment_method: s.payment_method, total_amount: s.quantity * s.unit_price,
  };
  const withOrder: DB = {
    ...base,
    orders: [...base.orders, order].sort((a, b) => a.order_id - b.order_id),
    order_items: [...base.order_items, { order_item_id: nextId(db.order_items, "order_item_id"), order_id, product_id: s.product_id, quantity: s.quantity, unit_price: s.unit_price }],
  };
  const r = setOrderStatus(withOrder, order_id, "Paid");
  if ("error" in r) return r;
  return { db: withTotals(r.db), order_id };
}

const today = () => new Date().toISOString().slice(0, 10);

export function finance(db: DB, now = today()) {
  const paid = db.orders.filter((o) => o.status === "Paid");
  const sum = (os: Order[]) => os.reduce((t, o) => t + orderTotal(db, o.order_id), 0);
  const qty = new Map<number, { qty: number; revenue: number }>();
  for (const i of db.order_items) {
    if (!paid.some((o) => o.order_id === i.order_id)) continue;
    const cur = qty.get(i.product_id) ?? { qty: 0, revenue: 0 };
    qty.set(i.product_id, { qty: cur.qty + i.quantity, revenue: cur.revenue + i.quantity * i.unit_price });
  }
  const best = [...qty.entries()]
    .map(([pid, v]) => ({ product_id: pid, name: db.products.find((p) => p.product_id === pid)?.name ?? `#${pid}`, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  return {
    totalRevenue: sum(paid),
    todayRevenue: sum(paid.filter((o) => o.order_date === now)),
    todayCount: paid.filter((o) => o.order_date === now).length,
    monthRevenue: sum(paid.filter((o) => o.order_date.slice(0, 7) === now.slice(0, 7))),
    salesCount: paid.length,
    best,
  };
}
