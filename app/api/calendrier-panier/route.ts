import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// la page du calendrier est aussi recopiée dans la boutique : on accepte ses appels
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

const SHOP = "yourmood.myshopify.com";
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN || "";
const ETIQUETTE = "col-calendrier-avent-2026";

// prix « calendrier » de chaque case : la fiche affiche le prix plein, le calendrier ce prix-ci
const PRIX_CALENDRIER: Record<number, number> = {
  1: 64, 2: 59, 3: 34, 4: 14, 5: 14, 6: 39, 7: 74, 8: 64, 9: 59, 10: 14, 11: 64, 12: 34,
  13: 14, 14: 89, 15: 34, 16: 34, 17: 39, 18: 54, 19: 54, 20: 74, 21: 54, 22: 64, 23: 89, 24: 54,
};

async function gql(query: string, variables?: Record<string, unknown>) {
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

// le numéro de la case se lit dans la référence : …-21.12.26-56 → 21
function caseDe(sku: string | null): number | null {
  const m = (sku || "").match(/-(\d{1,2})\.12\.26(?:-|$)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function POST(request: Request) {
  if (!TOKEN) return NextResponse.json({ error: "pas d'accès boutique" }, { status: 503, headers: CORS });
  try {
    const body = await request.json();
    const ids: string[] = (body?.ids || []).map(String).filter((x: string) => /^\d+$/.test(x));
    if (ids.length < 2 || ids.length > 30) return NextResponse.json({ error: "sélection invalide" }, { status: 400, headers: CORS });

    const d = await gql(
      `query($ids:[ID!]!){ nodes(ids:$ids){ ... on ProductVariant { id price sku product { tags } } } }`,
      { ids: ids.map((i) => `gid://shopify/ProductVariant/${i}`) }
    );
    const vs = (d.nodes || []).filter(Boolean) as Array<{ id: string; price: string; sku: string | null; product: { tags: string[] } }>;
    if (vs.length !== ids.length) return NextResponse.json({ error: "une pièce est introuvable" }, { status: 400, headers: CORS });

    let somme = 0, cible = 0;
    for (const v of vs) {
      if (!v.product.tags.includes(ETIQUETTE)) return NextResponse.json({ error: "pièce hors calendrier" }, { status: 400, headers: CORS });
      const prix = parseFloat(v.price);
      somme += prix;
      const n = caseDe(v.sku);
      // le coffret (pas de numéro de case) garde son prix
      cible += n && PRIX_CALENDRIER[n] !== undefined ? PRIX_CALENDRIER[n] : prix;
    }
    somme = Math.round(somme * 100) / 100;
    cible = Math.round(cible * 100) / 100;
    const remise = Math.round((somme - cible) * 100) / 100;
    const cart = `https://www.yourmood.net/cart/${ids.map((i) => i + ":1").join(",")}`;
    if (remise <= 0) return NextResponse.json({ lien: cart, somme, cible, remise: 0 }, { headers: CORS });

    const code = "CAL" + String(somme).replace(".", "") + "R" + String(remise).replace(".", "");
    const ex = await gql(`query($c:String!){ codeDiscountNodeByCode(code:$c){ id } }`, { c: code });
    if (!ex.codeDiscountNodeByCode) {
      const cr = await gql(
        `mutation($d:DiscountCodeBasicInput!){ discountCodeBasicCreate(basicCodeDiscount:$d){ userErrors{ field message } } }`,
        {
          d: {
            title: "Calendrier de l'Avent " + somme + " → " + cible,
            code,
            startsAt: new Date().toISOString(),
            customerSelection: { all: true },
            appliesOncePerCustomer: false,
            minimumRequirement: { subtotal: { greaterThanOrEqualToSubtotal: String(somme) } },
            customerGets: { value: { discountAmount: { amount: String(remise), appliesOnEachItem: false } }, items: { all: true } },
          },
        }
      );
      const er = cr?.discountCodeBasicCreate?.userErrors || [];
      if (er.length) return NextResponse.json({ error: "remise refusée : " + JSON.stringify(er).slice(0, 160) }, { status: 500, headers: CORS });
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const v = await gql(`query($c:String!){ codeDiscountNodeByCode(code:$c){ id } }`, { c: code });
        if (v.codeDiscountNodeByCode) break;
      }
    }
    return NextResponse.json({ lien: cart + "?discount=" + code, somme, cible, remise, code }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 200) }, { status: 500, headers: CORS });
  }
}
