import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

async function fetchDraftOrders(status: "open" | "completed"): Promise<unknown[]> {
  const all: unknown[] = [];
  let url: string | null =
    `https://${STORE}/admin/api/${API_VERSION}/draft_orders.json?status=${status}&limit=250`;

  while (url) {
    const r: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Shopify ${r.status}: ${await r.text()}`);
    const data = await r.json();
    all.push(...(data.draft_orders ?? []));

    // Pagination via Link header
    const link = r.headers.get("Link") ?? "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }
  return all;
}

export async function GET() {
  try {
    const [open, completed] = await Promise.all([
      fetchDraftOrders("open"),
      fetchDraftOrders("completed"),
    ]);

    // Filtrer par tag "devis-sur-mesure" côté serveur
    const hasTag = (d: unknown) => {
      const tags: string = (d as Record<string, unknown>).tags as string ?? "";
      return tags.includes("devis-sur-mesure");
    };

    const enCours = open.filter(hasTag);
    const valides = completed.filter(hasTag);

    return NextResponse.json({ enCours, valides });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
