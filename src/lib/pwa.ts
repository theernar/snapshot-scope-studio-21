import { allowServiceWorker } from "./pwa-policy";

/** The only app-shell SW registrar. Invoked after hydration, never during SSR. */
export async function initializePwa() {
  if (!("serviceWorker" in navigator)) return;
  if (!allowServiceWorker(import.meta.env.PROD, window.location.hostname.toLowerCase(), window.self !== window.top, window.location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => {
      const script = registration.active?.scriptURL ?? registration.waiting?.scriptURL ?? registration.installing?.scriptURL;
      return script && new URL(script).origin === window.location.origin && new URL(script).pathname === "/sw.js";
    }).map((registration) => registration.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true, onRegisterError: (error) => console.warn("Offline support unavailable", error) });
}