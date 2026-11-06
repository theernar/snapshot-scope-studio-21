// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [VitePWA({
    strategies: "generateSW",
    filename: "sw.js",
    outDir: "dist/client",
    injectRegister: null,
    registerType: "autoUpdate",
    devOptions: { enabled: false },
    manifest: false,
    includeAssets: ["icons/*.png", "favicon.png", "manifest.webmanifest"],
    workbox: {
      globDirectory: "dist/client",
      globPatterns: ["**/*.{js,css,jpg,png,svg,woff2}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      additionalManifestEntries: [{ url: "/", revision: String(Date.now()) }],
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !/^\/(?:~oauth|api|_serverFn)(?:\/|$)/.test(url.pathname),
        handler: "NetworkFirst",
        options: {
          cacheName: "crm-navigation-v1",
          networkTimeoutSeconds: 4,
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
          precacheFallback: { fallbackURL: "/" },
        },
      }],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
