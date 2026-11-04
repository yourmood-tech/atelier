import { NextResponse } from "next/server";

// Le catalogue de Noël (mood-tools.yourmood.net/catalogue-noel) demande ici la fiche
// d'un bijou quand on appuie dessus : photos, prix, tailles. Lecture seule.

export const dynamic = "force-dynamic";

const SHOP = "yourmood.myshopify.com";
const TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type Variant = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
};

// Listes de choix du catalogue (« choisis ta couleur ») : une recherche boutique + un tri
type Item = { title: string; handle: string; onlineStoreUrl: string | null; featuredImage: { url: string } | null; variants: { nodes: { price: string }[] } };
const LISTES: Record<string, { q: string; garde: (t: string, prix: number) => boolean }> = {
  "alu-addon": { q: "title:*aluminium* AND title:*addon* AND status:active", garde: (t, p) => p === 54 && !/deux tiers|medium|\bminis?\b|[«"“]/i.test(t) },
  "alu-deux-tiers": { q: "title:*aluminium* AND (title:*deux tiers* OR title:*2/3*) AND status:active", garde: (t, p) => p === 45 && !/[«"“]|tsukihana/i.test(t) },
  "alu-medium": { q: "title:*aluminium* AND title:*medium* AND status:active", garde: (t, p) => p <= 28 && !/[«"“]/i.test(t) },
  "alu-minis": { q: "title:*aluminium* AND title:*mini* AND status:active", garde: (t, p) => p <= 60 && !/[«"“]|pack de 4/i.test(t) },
  "aura-medium": { q: "title:*aura* AND title:*medium* AND status:active", garde: (t, p) => p >= 199 && p <= 209 && !/pack|^\s*\d+\s*🎁/i.test(t) },
  "mini-aura": { q: "title:*mini* AND (title:*aura* OR title:*sakura* OR title:*aurelles*) AND status:active", garde: (t) => !/stell|eau & feu|acier|astral|^\s*\d+\s*🎁/i.test(t) },
  "boite-voyage": { q: "title:*Boîte à Bijoux Voyage* AND status:active", garde: () => true },
};

async function liste(cle: string) {
  const L = LISTES[cle];
  if (!L) return NextResponse.json({ error: "liste inconnue" }, { status: 400, headers: CORS });
  const tous: Item[] = [];
  let after: string | null = null;
  for (let page = 0; page < 6; page++) {
    const r: Response = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($q:String!,$a:String){ products(first:100, query:$q, after:$a){ pageInfo{ hasNextPage endCursor } nodes{ title handle onlineStoreUrl featuredImage{ url } variants(first:1){ nodes{ price } } } } }`,
        variables: { q: L.q, a: after },
      }),
      next: { revalidate: 600 },
    });
    const j: { data?: { products?: { nodes: Item[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } } = await r.json();
    const d = j?.data?.products;
    if (!d) break;
    tous.push(...d.nodes);
    if (!d.pageInfo.hasNextPage) break;
    after = d.pageInfo.endCursor;
  }
  const items = tous
    .filter((p) => p.onlineStoreUrl && p.featuredImage)
    .map((p) => ({ titre: p.title, handle: p.handle, image: p.featuredImage!.url + (p.featuredImage!.url.includes("?") ? "&" : "?") + "width=400", prix: parseFloat(p.variants.nodes[0]?.price || "0") }))
    .filter((p) => LISTES[cle].garde(p.titre, p.prix))
    .sort((a, b) => a.prix - b.prix || a.titre.localeCompare(b.titre));
  return NextResponse.json({ items }, { headers: { ...CORS, "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } });
}

export async function GET(request: Request) {
  if (!TOKEN) return NextResponse.json({ error: "pas d'accès boutique" }, { status: 503, headers: CORS });
  const cle = (new URL(request.url).searchParams.get("liste") || "").trim();
  if (cle) {
    try { return await liste(cle); } catch (e) { return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 200) }, { status: 500, headers: CORS }); }
  }
  const handle = (new URL(request.url).searchParams.get("h") || "").trim();
  if (!/^[a-z0-9-]{1,200}$/.test(handle)) return NextResponse.json({ error: "adresse invalide" }, { status: 400, headers: CORS });
  try {
    const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($h:String!){ productByHandle(handle:$h){ title handle status onlineStoreUrl descriptionHtml
          images(first:6){ nodes{ url altText } }
          options{ name values }
          variants(first:100){ nodes{ id title price compareAtPrice availableForSale selectedOptions{ name value } } } } }`,
        variables: { h: handle },
      }),
      next: { revalidate: 300 },
    });
    const j = await r.json();
    const p = j?.data?.productByHandle;
    if (!p || p.status !== "ACTIVE" || !p.onlineStoreUrl) {
      return NextResponse.json({ error: "fiche indisponible" }, { status: 404, headers: CORS });
    }
    const variants = (p.variants.nodes as Variant[]).map((v) => ({
      id: v.id.split("/").pop(),
      titre: v.title,
      prix: parseFloat(v.price),
      prixAvant: v.compareAtPrice && parseFloat(v.compareAtPrice) > parseFloat(v.price) ? parseFloat(v.compareAtPrice) : null,
      dispo: v.availableForSale,
      options: v.selectedOptions.map((o) => o.value),
    }));
    // premier vrai paragraphe de la description (avant « Précautions », « Design »…)
    const blocs = String(p.descriptionHtml || "")
      .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
      .split("\n").map((x) => x.replace(/\s+/g, " ").trim())
      .filter((x) => x.length > 25 && !/^(design|précaution|notre inspiration|compatib|taille|matière|dimensions|nous vous rendons|✨|trouver mon)/i.test(x) && !/garde-mood3 questions/i.test(x));
    const texte = blocs.slice(0, 2).join(" ");
    return NextResponse.json(
      {
        titre: p.title,
        handle: p.handle,
        url: p.onlineStoreUrl,
        texte: texte.length > 260 ? texte.slice(0, 257).replace(/\s\S*$/, "") + "…" : texte,
        images: (p.images.nodes as { url: string }[]).map((i) => i.url + (i.url.includes("?") ? "&" : "?") + "width=900"),
        options: (p.options as { name: string; values: string[] }[]).filter((o) => !(o.name === "Title" && o.values.length === 1)),
        variants,
      },
      { headers: { ...CORS, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e).slice(0, 200) }, { status: 500, headers: CORS });
  }
}
