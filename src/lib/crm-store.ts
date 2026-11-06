import { useSyncExternalStore } from "react";
import { withTotals, type DB } from "./crm-logic";
import { seed } from "./crm-seed";

const KEY = "crm-erp-db-v2";
let state: DB = seed;
let loaded = false;
const listeners = new Set<() => void>();

/** Fills product fields added after the user's data was saved (image, supplier, cost, description). */
function migrate(db: DB): DB {
  return {
    ...db,
    defects: db.defects ?? [],
    employees: db.employees.map((e) => {
      const code = e.seller_code ?? seed.employees.find((s) => s.employee_id === e.employee_id)?.seller_code;
      return code ? { ...e, seller_code: code } : e;
    }),
    products: db.products.map((p) => {
      const s = seed.products.find((s) => s.product_id === p.product_id);
      return {
        ...p,
        image_url: p.image_url ?? s?.image_url ?? "",
        supplier_name: p.supplier_name ?? s?.supplier_name ?? "",
        cost_price: p.cost_price ?? s?.cost_price ?? 0,
        description: p.description ?? s?.description ?? "",
      };
    }),
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = withTotals(migrate(JSON.parse(raw)));
  } catch {
    /* ignore */
  }
}

export function getDB() {
  load();
  return state;
}

export function setDB(next: DB) {
  state = withTotals(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function resetDB() {
  setDB(seed);
}

export function useDB(): DB {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getDB,
    () => seed,
  );
}
