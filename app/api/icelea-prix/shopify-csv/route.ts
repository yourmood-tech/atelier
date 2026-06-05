import { NextRequest, NextResponse } from "next/server";

const KATANA_KEY = process.env.KATANA_API_KEY!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN!;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_API = `https://${SHOPIFY_STORE}/admin/api/2025-01`;
const KATANA_BASE = "https://api.katanamrp.com";
const IMPACT_THRESHOLD = 0.05;
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms));

interface CompareRow {
  variant_id: number; delta: number | null; ref: string;
}

async function katanaGet(path: string) {
  const res = await fetch(`${KATANA_BASE}${path}`, {
    headers: { Authorization: KATANA_KEY, Accept: "application/json" }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`Katana ${res.status} ${path}`);
  return res.json();
}

function parseNextLink(h: string | null) {
  return h?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { rows, filename } = (await req.json()) as { rows: CompareRow[]; filename?: string };

    // Only variants with >5% increase
    const impacted = (rows ?? []).filter(r => r.delta !== null && r.delta > IMPACT_THRESHOLD);
    if (!impacted.length) {
      return NextResponse.json({ message: "Aucun article avec hausse >5% — pas de CSV à générer." });
    }

    const impactedIds = new Set(impacted.map(r => r.variant_id));

    // Scan Katana recipes
    const allRecipes: Record<string, unknown>[] = [];
    let page = 1;
    while (true) {
      const data = await katanaGet(`/v1/recipes?limit=200&page=${page}`);
      const batch: Record<string, unknown>[] = data.data ?? [];
      allRecipes.push(...batch);
      if (batch.length < 200) break;
      page++;
      await SLEEP(200);
    }

    // Find product variant IDs that use impacted ingredients
    const pvToRefs = new Map<number, Set<string>>();
    for (const row of allRecipes) {
      const ingId = row.ingredient_variant_id as number;
      const pvId = row.product_variant_id as number;
      if (impactedIds.has(ingId)) {
        const r = impacted.find(x => x.variant_id === ingId);
        if (!pvToRefs.has(pvId)) pvToRefs.set(pvId, new Set());
        if (r) pvToRefs.get(pvId)!.add(`${r.ref}(+${((r.delta ?? 0) * 100).toFixed(1)}%)`);
      }
    }

    if (!pvToRefs.size) {
      return NextResponse.json({ message: "Aucun produit Katana trouvé dans les recettes (0 match BOM)." });
    }

    // Resolve Katana variant IDs → SKUs
    const katanaSkuMap = new Map<number, string>();
    const ids = [...pvToRefs.keys()];
    for (let i = 0; i < ids.length; i++) {
      try {
        const v = await katanaGet(`/v1/variants/${ids[i]}`);
        if (v?.sku) katanaSkuMap.set(ids[i], v.sku);
        await SLEEP(100);
      } catch { /* skip */ }
    }

    // Load Shopify products
    const shopifyVariants = new Map<string, { id: number; title: string; productId: number; productTitle: string; price: string }>();
    let url: string | null = `${SHOPIFY_API}/products.json?limit=250&fields=id,title,variants`;
    while (url) {
      const res = await fetch(url, { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN }, cache: "no-store" });
      if (!res.ok) break;
      const json = await res.json() as { products: { id: number; title: string; variants: { id: number; sku: string; title: string; price: string }[] }[] };
      for (const p of json.products) {
        for (const v of p.variants ?? []) {
          if (v.sku) shopifyVariants.set(v.sku, { id: v.id, title: v.title, productId: p.id, productTitle: p.title, price: v.price });
        }
      }
      url = parseNextLink(res.headers.get("link"));
      if (url) await SLEEP(350);
    }

    // Build impact rows
    const csvRows: string[] = [];
    const headers = ["shopify_product_id","shopify_title","shopify_variant_id","shopify_variant_title","shopify_sku","current_shopify_price","icelea_refs","suggested_new_price"];
    csvRows.push(headers.join(","));

    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;

    for (const [pvId, refs] of pvToRefs) {
      const sku = katanaSkuMap.get(pvId);
      if (!sku) continue;
      const sv = shopifyVariants.get(sku);
      if (!sv) continue;
      csvRows.push([
        esc(sv.productId), esc(sv.productTitle), esc(sv.id), esc(sv.title),
        esc(sku), esc(sv.price), esc([...refs].join("; ")), esc(""),
      ].join(","));
    }

    if (csvRows.length <= 1) {
      return NextResponse.json({ message: "Aucun produit Shopify correspondant trouvé." });
    }

    const date = new Date().toISOString().slice(0, 10);
    const fname = filename ?? `icelea-shopify-impact-${date}.csv`;
    const body = csvRows.join("\n");

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
