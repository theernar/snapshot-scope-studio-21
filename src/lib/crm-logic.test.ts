import { describe, it, expect } from "vitest";
import { orderTotal, setOrderStatus, validateItem } from "./crm-logic";
import { seed } from "./crm-seed";

describe("order rules", () => {
  it("calculates order total from items", () => {
    expect(orderTotal(seed, 2)).toBe(3 * 575000 + 3 * 155000);
  });
  it("deducts stock when marked Paid", () => {
    const r = setOrderStatus(seed, 3, "Paid");
    if ("error" in r) throw new Error(r.error);
    expect(r.db.products.find((p) => p.product_id === 2)!.stock_qty).toBe(6);
  });
  it("restores stock when a Paid order is cancelled", () => {
    const r = setOrderStatus(seed, 1, "Cancelled");
    if ("error" in r) throw new Error(r.error);
    expect(r.db.products.find((p) => p.product_id === 1)!.stock_qty).toBe(52);
  });
  it("rejects payment with insufficient stock", () => {
    const db = { ...seed, order_items: [...seed.order_items, { order_item_id: 99, order_id: 3, product_id: 5, quantity: 50, unit_price: 12000 }] };
    expect("error" in setOrderStatus(db, 3, "Paid")).toBe(true);
  });
  it("rejects an item exceeding stock", () => {
    expect(validateItem(seed, { order_id: 3, product_id: 5, quantity: 6, unit_price: 12000 })).toMatch(/Insufficient/);
  });
});

import { completeSale, finance, setOrderStatus as sos } from "./crm-logic";
const sale = { product_id: 4, quantity: 3, customer_id: 1, employee_id: 1, unit_price: 15000, payment_method: "Kaspi" as const, sale_date: "2026-10-30" };

describe("sales", () => {
  it("completing a sale deducts stock and adds revenue", () => {
    const r = completeSale(seed, sale);
    if ("error" in r) throw new Error(r.error);
    expect(r.db.products.find((p) => p.product_id === 4)!.stock_qty).toBe(117);
    expect(finance(r.db, "2026-10-30").totalRevenue).toBe(finance(seed, "2026-10-30").totalRevenue + 45000);
    expect(r.db.orders.find((o) => o.order_id === r.order_id)!.total_amount).toBe(45000);
  });
  it("blocks a sale larger than stock", () => {
    expect("error" in completeSale(seed, { ...sale, product_id: 5, quantity: 6 })).toBe(true);
  });
  it("refunding restores stock and removes revenue", () => {
    const r = completeSale(seed, sale);
    if ("error" in r) throw new Error(r.error);
    const back = sos(r.db, r.order_id, "Refunded");
    if ("error" in back) throw new Error(back.error);
    expect(back.db.products.find((p) => p.product_id === 4)!.stock_qty).toBe(120);
    expect(finance(back.db).totalRevenue).toBe(finance(seed).totalRevenue);
  });
  it("editing a sale re-applies stock for the new quantity", () => {
    const r = completeSale(seed, sale);
    if ("error" in r) throw new Error(r.error);
    const e = completeSale(r.db, { ...sale, quantity: 10 }, r.order_id);
    if ("error" in e) throw new Error(e.error);
    expect(e.db.products.find((p) => p.product_id === 4)!.stock_qty).toBe(110);
  });
});

import { registerDefect, defectLoss, monthStats } from "./crm-logic";
describe("defects", () => {
  it("removes defective units from stock and computes loss = cost × qty", () => {
    const r = registerDefect(seed, { product_id: 1, quantity: 3, reason: "Broken leg", employee_id: 1, reported_date: "2026-10-30" });
    if ("error" in r) throw new Error(r.error);
    expect(r.db.products.find((p) => p.product_id === 1)!.stock_qty).toBe(39);
    const defect = r.db.defects[0];
    if (!defect) throw new Error("Defect missing");
    expect(defectLoss(defect)).toBe(3 * 62000);
  });
  it("rejects more defective units than in stock", () => {
    expect("error" in registerDefect(seed, { product_id: 2, quantity: 9, reason: "x", employee_id: 1, reported_date: "2026-10-30" })).toBe(true);
  });
  it("does not count defects as revenue", () => {
    const order = seed.orders[0];
    if (!order) throw new Error("Sample order missing");
    const m = order.order_date.slice(0, 7);
    const r = registerDefect(seed, { product_id: 1, quantity: 1, reason: "x", employee_id: 1, reported_date: m + "-01" });
    if ("error" in r) throw new Error(r.error);
    expect(monthStats(r.db, m).revenue).toBe(monthStats(seed, m).revenue);
  });
});
