import { useSyncExternalStore } from "react";

export type Session = { seller_id: string; employee_id: number; full_name: string };
const KEY = "crm-seller-session";
const listeners = new Set<() => void>();
let cache: Session | null | undefined;

function read(): Session | null {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    cache = null;
  }
  return cache ?? null;
}

export function setSession(s: Session | null) {
  cache = s;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

/** undefined = not yet known (SSR / before hydration). */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => undefined,
  );
}
