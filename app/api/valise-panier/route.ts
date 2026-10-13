import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHOP = "yourmood.myshopify.com";
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN || "";
const PRIX_VALISE = 429;

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

export async function POST(request: Request) {
  if (!TOKEN) return NextResponse.json({ error: "pas d'accès boutique" }, { status: 503 });
  try {
    const body = await request.json();
    const ids: string[] = (body?.ids || []).map(String).filter((x: string) => /^\d+$/.test(x));
    if (ids.length !== 5) return NextResponse.json({ error: "il faut cinq pièces" }, { status: 400 });

    // les vrais prix, maintenant — et on vérifie que ce sont bien des pièces de la valise
    const d = await gql(
      `query($ids:[ID!]!){ nodes(ids:$ids){ ... on ProductVariant { id price availableForSale product { tags } } } }`,
      { ids: ids.map((i) => `gid://shopify/ProductVariant/${i}`) }
    );
    const vs = (d.nodes || []).filter(Boolean) as Array<{ id: string; price: string; availableForSale: boolean; product: { tags: string[] } }>;
    if (vs.length !== 5) return NextResponse.json({ error: "une pièce est introuvable" }, { status: 400 });
    for (const v of vs) {
      if (!v.product.tags.includes("grande-valise"))
        return NextResponse.json({ error: "pièce hors valise" }, { status: 400 });
    }

    const somme = Math.round(vs.reduce((a, v) => a + parseFloat(v.price), 0) * 100) / 100;
    const remise = Math.round((somme - PRIX_VALISE) * 100) / 100;
    if (remise <= 0) {
      return NextResponse.json({ lien: `https://www.yourmood.net/cart/${ids.map((i) => i + ":1").join(",")}`, somme, remise: 0 });
    }

    const code = "GV" + String(somme).replace(".", "");

    // la remise existe-t-elle déjà ? (recherche exacte par le code)
    const ex = await gql(`query($c:String!){ codeDiscountNodeByCode(code:$c){ id } }`, { c: code });
    if (!ex.codeDiscountNodeByCode) {
      const cr = await gql(
        `mutation($d:DiscountCodeBasicInput!){ discountCodeBasicCreate(basicCodeDiscount:$d){ userErrors{ field message } } }`,
        {
          d: {
            title: "Grande Valise " + somme,
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
      if (er.length) return NextResponse.json({ error: "remise refusée : " + JSON.stringify(er).slice(0, 160) }, { status: 500 });
      // on attend que la boutique la reconnaisse
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const v = await gql(`query($c:String!){ codeDiscountNodeByCode(code:$c){ id } }`, { c: code });
        if (v.codeDiscountNodeByCode) break;
      }
    }

    const lien = `https://www.yourmood.net/cart/${ids.map((i) => i + ":1").join(",")}?discount=${code}`;
    return NextResponse.json({ lien, somme, remise, code });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 200) }, { status: 500 });
  }
}
