import { createServerFn } from "@tanstack/react-start";

/** Validates a seller ID on the server. Seller accounts live only in server code; add more entries here. */
export const loginSeller = createServerFn({ method: "POST" })
  .inputValidator((input: { sellerId: string }) => ({ sellerId: String(input?.sellerId ?? "").trim().toUpperCase().slice(0, 32) }))
  .handler(async ({ data }) => {
    const SELLERS: Record<string, { employee_id: number; full_name: string }> = {
      "24B032169": { employee_id: 1, full_name: "Aigerim Sadykova" },
    };
    const s = SELLERS[data.sellerId];
    if (!s) return { ok: false as const, error: "Invalid Seller ID. Check the ID and try again." };
    return { ok: true as const, seller: { seller_id: data.sellerId, ...s } };
  });
