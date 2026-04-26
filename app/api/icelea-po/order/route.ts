import { NextRequest, NextResponse } from "next/server";
import { lookupOrderByName } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name?.trim()) {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }

  try {
    const order = await lookupOrderByName(name.trim());
    return NextResponse.json({ ok: true, orderId: order.id, orderName: order.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Introuvable" },
      { status: 404 }
    );
  }
}
