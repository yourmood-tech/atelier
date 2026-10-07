// Les photos des 4 pièces Halloween 2026 : ordre, cadrage, ajouts.
// Stocké dans Vercel KV, partagé pour toute l'équipe.
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

const EDITORS = new Set(["amila@yourmood.net"]);
const canEdit = (email?: string | null) => !!email && EDITORS.has(email.toLowerCase());
const KEY = "hw2026:photos";

export type Photo = { src: string; pos?: string };          // pos = "50% 50%"
export type Piece = { cle: string; nom: string; desc: string; lien: string; photos: Photo[] };

const PIECES: { cle: string; nom: string; desc: string; handle: string }[] = [
  { cle: "skully",   nom: "Skully",   desc: "l'anneau tête de mort, serti de huit pierres", handle: "anneau-addon-skully-en-aluminium-serti-couleur-a-choix" },
  { cle: "aranea",   nom: "Aranea",   desc: "l'araignée et sa toile de six diamants",       handle: "anneau-addon-aranea-en-aluminium-noir-serti-de-diamants" },
  { cle: "debbie",   nom: "Debbie",   desc: "la citrouille sertie de treize diamants",      handle: "debbie-addon-en-aluminium-serti-de-13-diamants-couleur-au-choix" },
  { cle: "calavera", nom: "Calavera", desc: "la calavera mexicaine, en fête",               handle: "anneau-calavera-en-aluminium-serti-couleur-et-format-a-choix" },
];

async function depuisBoutique(): Promise<Piece[]> {
  const tok = process.env.SHOPIFY_API_TOKEN || "";
  const out: Piece[] = [];
  for (const p of PIECES) {
    let photos: Photo[] = [];
    try {
      const r = await fetch("https://yourmood.myshopify.com/admin/api/2025-01/graphql.json", {
        method: "POST",
        headers: { "X-Shopify-Access-Token": tok, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `{ productByHandle(handle:"${p.handle}"){ media(first:30){ nodes{ ... on MediaImage { image{url} } } } } }` }),
        cache: "no-store",
      });
      const d = await r.json();
      const n = d?.data?.productByHandle?.media?.nodes || [];
      photos = n.filter((m: { image?: { url: string } }) => m?.image?.url).map((m: { image: { url: string } }) => ({ src: m.image.url }));
    } catch { /* la boutique ne répond pas : on laisse vide */ }
    out.push({ cle: p.cle, nom: p.nom, desc: p.desc, lien: "https://www.yourmood.net/products/" + p.handle, photos });
  }
  return out;
}

export async function GET() {
  const session = await auth().catch(() => null);
  let pieces = (await kv.get<Piece[]>(KEY)) || null;
  if (!pieces) pieces = await depuisBoutique();
  return NextResponse.json({ pieces, peutModifier: canEdit(session?.user?.email) });
}

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!canEdit(session?.user?.email)) return NextResponse.json({ error: "lecture seule" }, { status: 403 });
  const body = await request.json();
  const pieces = body?.pieces as Piece[] | undefined;
  if (!Array.isArray(pieces)) return NextResponse.json({ error: "format" }, { status: 400 });
  // les photos ajoutées (collées) sont rangées à part et servies une par une
  for (const p of pieces) {
    for (const ph of p.photos) {
      if (ph.src.startsWith("data:")) {
        const id = p.cle + "-" + Math.random().toString(36).slice(2, 10);
        await kv.set("hw2026:img:" + id, ph.src);
        ph.src = "/api/hw-photo?id=" + id;
      }
    }
  }
  await kv.set(KEY, pieces);
  return NextResponse.json({ ok: true, pieces });
}

export async function DELETE() {
  const session = await auth().catch(() => null);
  if (!canEdit(session?.user?.email)) return NextResponse.json({ error: "lecture seule" }, { status: 403 });
  await kv.del(KEY);
  return NextResponse.json({ ok: true, pieces: await depuisBoutique() });
}
