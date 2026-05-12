// Helper partagé — ajoute une entrée horodatée dans le note du draft order

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

function timestamp(): string {
  return new Date().toLocaleString("fr-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function appendTimeline(id: string, entry: string): Promise<void> {
  try {
    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      cache: "no-store",
    });
    const { draft_order } = await r.json();
    const line = `▸ ${timestamp()} — ${entry}`;
    const note = draft_order.note ? `${draft_order.note}\n${line}` : line;
    await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      method: "PUT",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ draft_order: { note, tags: draft_order.tags } }),
      cache: "no-store",
    });
  } catch {
    // Non-bloquant : log silencieux
    console.error(`appendTimeline(${id}): échec`);
  }
}
