import { describe, expect, it, vi, afterEach } from "vitest";
import { allowServiceWorker, offlineSaleError, OFFLINE_SALE_ERROR } from "./pwa-policy";
import { recordSale, saveOrder, changeSaleStatus, deleteOrder } from "./crm-actions";
import { getDB } from "./crm-store";

afterEach(() => vi.restoreAllMocks());
describe("PWA safety", () => {
  it("never registers in development", () => expect(allowServiceWorker(false, "localhost", false, "")).toBe(false));
  it("never registers inside the editor iframe", () => expect(allowServiceWorker(true, "business.example", true, "")).toBe(false));
  it("never registers on Lovable previews", () => {
    for (const host of ["id-preview--845ab91a-d43c-48f2-bd4e-674675088687.lovable.app", "preview-2--shop.gpt-eng.com", "project--shop-dev.lovable.app", "a.lovableproject.com", "beta.lovable.dev"]) {
      expect(allowServiceWorker(true, host, false, "")).toBe(false);
    }
  });
  it("allows published domains", () => expect(allowServiceWorker(true, "snapshot-scope-studio-21.lovable.app", false, "")).toBe(true));
  it("supports the explicit off switch", () => expect(allowServiceWorker(true, "business.example", false, "?sw=off")).toBe(false));
  it("does not reject a custom domain just because its label looks like preview", () => expect(allowServiceWorker(true, "preview-v2--shop.example.com", false, "")).toBe(true));
  it("blocks offline completed sales without changing stock, orders, or revenue", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const before = getDB();
    expect(recordSale({ product_id: 1, quantity: 1, customer_id: 1, employee_id: 1, unit_price: 100, payment_method: "Cash", sale_date: "2026-10-30" })).toBe(OFFLINE_SALE_ERROR);
    expect(getDB()).toBe(before);
  });
  it("blocks the Orders page Paid bypass offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const before = getDB();
    expect(saveOrder({ order_date: "2026-10-30", status: "Paid", customer_id: 1, employee_id: 1, payment_method: "Cash" }, 3)).toBe(OFFLINE_SALE_ERROR);
    expect(getDB()).toBe(before);
  });
  it("does not refund or delete financial records offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const before = getDB();
    expect(changeSaleStatus(1, "Refunded")).toBe(OFFLINE_SALE_ERROR);
    expect(deleteOrder(1)).toBe(OFFLINE_SALE_ERROR);
    expect(getDB()).toBe(before);
  });
  it("reconnecting clears the guard but does not replay transactions", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const before = getDB();
    expect(offlineSaleError()).toBeNull();
    window.dispatchEvent(new Event("online"));
    expect(getDB()).toBe(before);
  });
});