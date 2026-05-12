import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const message = body.message || "Bonjour, ton devis personnalisé Mood est prêt. Tu peux finaliser ta commande en cliquant sur le lien ci-dessous.";

  try {
    // Récupérer le draft pour avoir l'email du client
    const getR = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
    });
    const { draft_order } = await getR.json();
    const email = draft_order.email || draft_order.customer?.email;

    if (!email) {
      return NextResponse.json({ error: "Pas d'email associé à ce draft" }, { status: 400 });
    }

    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}/send_invoice.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_order_invoice: {
          to: email,
          subject: "Ton devis Mood Collection — Design personnalisé confirmé",
          custom_message: message,
        },
      }),
    });

    if (!r.ok) {
      const err = await r.json();
      return NextResponse.json({ error: JSON.stringify(err).slice(0, 200) }, { status: r.status });
    }

    return NextResponse.json({ ok: true, email });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
