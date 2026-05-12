import { NextResponse } from "next/server";
import { appendTimeline } from "../../_timeline";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY!;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const customMessage: string = body.message ?? "";

  try {
    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ error: `Draft introuvable (${r.status})` }, { status: r.status });
    const { draft_order } = await r.json();

    const email: string = draft_order.email || draft_order.customer?.email;
    if (!email) return NextResponse.json({ error: "Pas d'email associé à ce devis" }, { status: 400 });

    const firstName: string = draft_order.customer?.first_name ?? "";
    const totalPrice: string = draft_order.total_price ?? "0.00";
    const orderName: string = draft_order.name ?? "";

    // Récupérer l'URL du design depuis les propriétés du line item
    const props: Array<{ name: string; value: string }> = draft_order.line_items?.[0]?.properties ?? [];
    const designProp = props.find((p) => ["Design SVG", "SVG Gravure", "SVG Complet"].includes(p.name));
    const designUrl: string = designProp?.value ?? "";

    // Klaviyo event DevisEnvoye → déclenche le flow email dans Klaviyo
    const kRes = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${KLAVIYO_KEY}`,
        "Content-Type": "application/json",
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            profile: {
              data: {
                type: "profile",
                attributes: { email, first_name: firstName },
              },
            },
            metric: {
              data: {
                type: "metric",
                attributes: { name: "DevisEnvoye" },
              },
            },
            properties: {
              order_name: orderName,
              total_price: totalPrice,
              design_url: designUrl,
              custom_message: customMessage,
            },
            time: new Date().toISOString(),
          },
        },
      }),
    });

    if (!kRes.ok) {
      const err = await kRes.text();
      return NextResponse.json({ error: `Klaviyo ${kRes.status}: ${err.slice(0, 200)}` }, { status: 500 });
    }

    appendTimeline(id, `Email devis envoyé → ${email} · CHF ${Number(totalPrice).toFixed(2)}`);
    return NextResponse.json({ ok: true, email });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
