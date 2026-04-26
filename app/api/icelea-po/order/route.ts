import { NextRequest, NextResponse } from "next/server";
import { lookupOrderByName } from "@/lib/shopify";

// Shopify internal order IDs are 10+ digit numbers
async function lookupById(id: string) {
  const STORE = process.env.SHOPIFY_STORE!;
  const TOKEN = process.env.SHOPIFY_API_TOKEN!;
  const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

  const res = await fetch(
    `https://${STORE}/admin/api/${VERSION}/orders/${id}.json?fields=id,name`,
    { headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Commande introuvable (${res.status})`);
  const data = await res.json() as { order?: { id: number; name: string } };
  if (!data.order) throw new Error(`Commande introuvable`);
  return { id: data.order.id, name: data.order.name };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const name = req.nextUrl.searchParams.get("name");

  if (!id && !name) {
    return NextResponse.json({ error: "id ou name requis" }, { status: 400 });
  }

  try {
    const order = id ? await lookupById(id) : await lookupOrderByName(name!);
    return NextResponse.json({ ok: true, orderId: order.id, orderName: order.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Introuvable" },
      { status: 404 }
    );
  }
}
