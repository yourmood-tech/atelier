import { NextResponse } from "next/server";
import { appendTimeline } from "../../_timeline";
import { getKlaviyoProfileLocale } from "@/lib/email";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const SUBJECT = {
  fr: "Ton devis Mood Collection — Finalise ta commande",
  de: "Dein Mood Collection Angebot — Bestellung abschließen",
  en: "Your Mood Collection quote — Complete your order",
};

const FIXED_MESSAGE = {
  fr: "Ce devis est définitif et ne peut plus être modifié. Tu peux finaliser ta commande en cliquant sur le lien ci-dessous.",
  de: "Dieses Angebot ist endgültig und kann nicht mehr geändert werden. Du kannst deine Bestellung über den untenstehenden Link abschließen.",
  en: "This quote is final and can no longer be modified. You can complete your order by clicking the link below.",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const getR = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN },
    });
    const { draft_order } = await getR.json();
    const email: string = draft_order.email || draft_order.customer?.email;

    if (!email) return NextResponse.json({ error: "Pas d'email associé à ce draft" }, { status: 400 });

    // Locale : Klaviyo profile, fallback fr
    const rawLocale = await getKlaviyoProfileLocale(email);
    const locale = (["fr", "de", "en"].includes(rawLocale ?? "") ? rawLocale : "fr") as "fr" | "de" | "en";

    // Message "non modifiable" fixe + message optionnel de l'équipe
    const teamMessage: string = body.message ?? "";
    const customMessage = teamMessage
      ? `${teamMessage}\n\n${FIXED_MESSAGE[locale]}`
      : FIXED_MESSAGE[locale];

    const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders/${id}/send_invoice.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_order_invoice: {
          to: email,
          subject: SUBJECT[locale],
          custom_message: customMessage,
        },
      }),
    });

    if (!r.ok) {
      const err = await r.json();
      return NextResponse.json({ error: JSON.stringify(err).slice(0, 200) }, { status: r.status });
    }

    appendTimeline(id, `Facture de paiement envoyée (${locale.toUpperCase()}) → ${email}`);
    return NextResponse.json({ ok: true, email, locale });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
