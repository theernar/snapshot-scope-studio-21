export const OFFLINE_SALE_ERROR = "You're offline. Reconnect before completing or changing sales. Nothing has been queued.";

export function isPreviewHost(hostname: string) {
  const host = hostname.toLowerCase();
  return /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)
    || /^project--.+-dev\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)
    || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function allowServiceWorker(production: boolean, hostname: string, framed: boolean, search: string) {
  return production && !framed && !isPreviewHost(hostname) && new URLSearchParams(search).get("sw") !== "off";
}

export function offlineSaleError(): string | null {
  return typeof navigator !== "undefined" && !navigator.onLine ? OFFLINE_SALE_ERROR : null;
}