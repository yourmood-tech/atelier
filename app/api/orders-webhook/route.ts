import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

type NoteAttribute = { name: string; value: string };

type ShopifyOrder = {
  id: number;
  name: string;
  note: string | null;
  tags: string;
  note_attributes: NoteAttribute[];
};

async function verifyHmac(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // Skip verification if secret not configured
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  return digest === hmacHeader;
}

async function shopifyPatch(orderId: number, body: unknown) {
  const r = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}/orders/${orderId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Shopify PATCH order ${orderId}: ${r.status} — ${text.slice(0, 200)}`);
  }
}

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Corps illisible" }, { status: 400 });
  }

  if (!(await verifyHmac(req, rawBody))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const designAttr = order.note_attributes?.find(
    (a) => a.name === "Design SVG"
  );

  // Not a perso order — ignore
  if (!designAttr) {
    return NextResponse.json({ ok: true, skipped: "no Design SVG attribute" });
  }

  const updates: { note?: string; tags?: string } = {};

  // Append SVG link to existing note (or create note)
  const svgLine = `🎨 Design personnalisé : ${designAttr.value}`;
  updates.note = order.note ? `${order.note}\n${svgLine}` : svgLine;

  // Add autoperso tag without removing existing tags
  const existingTags = order.tags
    ? order.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  if (!existingTags.includes("autoperso")) {
    updates.tags = [...existingTags, "autoperso"].join(", ");
  }

  try {
    await shopifyPatch(order.id, { order: { id: order.id, ...updates } });
    console.log(`orders-webhook: order ${order.name} — tag autoperso + note SVG ajoutés`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("orders-webhook patch error:", (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
