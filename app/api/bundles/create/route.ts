import { NextRequest, NextResponse } from "next/server";

type Component = { variantId: number; quantity: number };

export async function POST(req: NextRequest) {
  try {
    const { bundleVariantId, components } = await req.json() as {
      bundleVariantId: number;
      components: Component[];
    };

    if (!bundleVariantId || !components?.length) {
      return NextResponse.json({ error: "bundleVariantId et components requis" }, { status: 400 });
    }

    const token = process.env.SIMPLE_BUNDLES_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "SIMPLE_BUNDLES_TOKEN non configuré" }, { status: 500 });
    }

    const body = {
      bundle_type: "simple",
      sync_price: true,
      has_custom_unit_price: false,
      rows: [
        {
          items: components.map((c) => ({ variant_id: c.variantId, quantity: c.quantity })),
        },
      ],
    };

    const res = await fetch(`https://api.simplebundles.io/api/v1/bundles/${bundleVariantId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { bundle?: { id: number; title: string }; errors?: string[] };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.errors?.join(", ") ?? `Simple Bundles ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, bundle: data.bundle });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
