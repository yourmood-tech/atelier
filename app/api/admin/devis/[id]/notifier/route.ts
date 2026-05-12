import { NextResponse } from "next/server";
import { appendTimeline } from "../../_timeline";
import { getKlaviyoProfileLocale } from "@/lib/email";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY!;

type Locale = "fr" | "de" | "en";

const T = {
  subject: {
    fr: (name: string) => `${name} — Ton devis Mood Collection est prêt`,
    de: (name: string) => `${name} — Dein Mood Collection Angebot ist bereit`,
    en: (name: string) => `${name} — Your Mood Collection quote is ready`,
  },
  greeting: {
    fr: (first: string) => first ? `Chère ${first},` : "Chère cliente,",
    de: (first: string) => first ? `Liebe ${first},` : "Liebe Kundin,",
    en: (first: string) => first ? `Dear ${first},` : "Dear customer,",
  },
  intro: {
    fr: (price: string) => `Ton design personnalisé a été finalisé par notre équipe. Le prix validé pour ta bague est de CHF ${price}.\n\nTu as la possibilité de demander une modification de ton devis une seule fois. Si tu fais une demande de modification, un nouveau devis te sera envoyé et le prix pourra varier en fonction de tes demandes.\n\nSi le design te convient, tu peux valider ta commande directement en cliquant sur le bouton ci-dessous.`,
    de: (price: string) => `Dein personalisiertes Design wurde von unserem Team fertiggestellt. Der bestätigte Preis für deinen Ring beträgt CHF ${price}.\n\nDu hast die Möglichkeit, einmalig eine Änderung an deinem Angebot zu beantragen. Bei einer Änderungsanfrage wird dir ein neues Angebot zugeschickt und der Preis kann je nach deinen Wünschen variieren.\n\nWenn du mit dem Design zufrieden bist, kannst du deine Bestellung direkt über den untenstehenden Button abschließen.`,
    en: (price: string) => `Your personalized design has been finalized by our team. The confirmed price for your ring is CHF ${price}.\n\nYou may request one modification to your quote. If you do, a new quote will be sent to you and the price may vary depending on your requests.\n\nIf you're happy with the design, you can confirm your order by clicking the button below.`,
  },
  pay_label: {
    fr: "Valider ma commande",
    de: "Bestellung abschließen",
    en: "Confirm my order",
  },
  sign_off: {
    fr: "L'équipe Mood Collection",
    de: "Das Mood Collection Team",
    en: "The Mood Collection team",
  },
};

function buildTexts(locale: Locale, firstName: string, orderName: string, totalPrice: string, customMessage: string) {
  const price = Number(totalPrice).toFixed(2);
  return {
    email_subject:  T.subject[locale](orderName),
    email_greeting: T.greeting[locale](firstName),
    email_intro:    T.intro[locale](price),
    email_body:     customMessage,
    pay_label:      T.pay_label[locale],
    email_sign_off: T.sign_off[locale],
  };
}

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
    const invoiceUrl: string = draft_order.invoice_url ?? "";

    const props: Array<{ name: string; value: string }> = draft_order.line_items?.[0]?.properties ?? [];
    const designProp = props.find((p) => ["Design SVG", "SVG Gravure", "SVG Complet"].includes(p.name));
    const designUrl: string = designProp?.value ?? "";

    const rawLocale = await getKlaviyoProfileLocale(email);
    const locale: Locale = (["fr", "de", "en"].includes(rawLocale ?? "") ? rawLocale : "fr") as Locale;

    const texts = buildTexts(locale, firstName, orderName, totalPrice, customMessage);

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
              invoice_url: invoiceUrl,
              locale,
              ...texts,
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

    appendTimeline(id, `Email devis envoyé (${locale.toUpperCase()}) → ${email} · CHF ${Number(totalPrice).toFixed(2)}`);
    return NextResponse.json({ ok: true, email, locale });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
