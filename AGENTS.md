<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Seller sign-in: seller IDs are validated by the `loginSeller` server function (src/lib/auth.functions.ts); the browser only stores the returned session. Why: keep seller accounts out of browser code.
- Business data (incl. defect records) lives in the browser store (src/lib/crm-store.ts); rules live in src/lib/crm-logic.ts with tests. Why: no backend database is enabled yet.
- Offline shell uses vite-plugin-pwa generateSW with NetworkFirst navigations and precached hashed assets; registration only occurs through src/lib/pwa.ts after hydration with preview, iframe, and kill-switch guards. Why: offline access must not stale-cache editor previews or server calls.
- Financial mutations go through crm-actions and reject offline requests without a queue; reconnect only restores connectivity. Why: the existing browser store has no server synchronization or transaction confirmation.
