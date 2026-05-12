import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  const d = await r.json();
  return d.result || null;
}

function extractDesignId(url: string): { designId: string; type: "alu" | "argent" } | null {
  // ALU: .../api/design/design_xxx
  const aluMatch = url.match(/\/api\/design\/(design_[^/?]+)/);
  if (aluMatch) return { designId: aluMatch[1], type: "alu" };
  // Argent: .../api/design-argent/argent_xxx/...
  const argentMatch = url.match(/\/api\/design-argent\/(argent_[^/?]+)/);
  if (argentMatch) return { designId: argentMatch[1], type: "argent" };
  return null;
}

// GET — détail d'un draft + SVG depuis Redis
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ error: `Draft order ${r.status}` }, { status: r.status });
    const { draft_order } = await r.json();

    // Extraire l'URL du design depuis les line item properties
    const props: Array<{ name: string; value: string }> = draft_order.line_items?.[0]?.properties ?? [];
    const designUrlProp = props.find((p) => p.name === "Design SVG" || p.name === "SVG Gravure" || p.name === "SVG Complet");
    let svgContent: string | null = null;
    let designMeta: { designId: string; type: "alu" | "argent" } | null = null;

    if (designUrlProp) {
      designMeta = extractDesignId(designUrlProp.value);
      if (designMeta) {
        const redisKey = designMeta.type === "alu"
          ? `perso:design:${designMeta.designId}`
          : `perso:argent:design:${designMeta.designId}:complet`;
        svgContent = await redisGet(redisKey);
      }
    }

    return NextResponse.json({ draft_order, svgContent, designMeta });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — modifier le prix du draft
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { prix } = await req.json();
  if (!prix || isNaN(Number(prix))) {
    return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
  }

  try {
    // Récupérer le draft pour conserver les line items
    const getR = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
    });
    const { draft_order } = await getR.json();
    const lineItem = draft_order.line_items?.[0];
    if (!lineItem) return NextResponse.json({ error: "Pas de ligne produit" }, { status: 400 });

    const patchBody = {
      draft_order: {
        line_items: [{
          variant_id: lineItem.variant_id,
          quantity: lineItem.quantity,
          price: Number(prix).toFixed(2),
          properties: lineItem.properties,
        }],
      },
    };

    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      method: "PUT",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json({ error: JSON.stringify(data).slice(0, 200) }, { status: r.status });
    return NextResponse.json({ ok: true, draft_order: data.draft_order });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
