import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { carnet, type Commande } from "@/lib/carnet/classe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Carnet cliente — mise à jour : chaque heure, les clientes dont une commande a bougé voient leur carnet recalculé
// sur TOUT leur historique, puis réécrit sur la fiche Shopify (custom.carnet_taille / carnet_bases / carnet_anneaux / carnet).
// Stockage partagé : 2 clés (carnet:depuis, carnet:file) → quelques demandes par heure seulement.
// À la main (?cle=<SAV_POSTE_CLE>) : &voir=<numéro de fiche> calcule sans écrire ; &bilan=1 dernier passage.
const DOM = process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE || "";
const JETON = process.env.MOOD_SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_TOKEN || "";

async function gql(query: string, variables: Record<string, unknown> = {}) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://${DOM}/admin/api/2025-01/graphql.json`, { method: "POST", headers: { "X-Shopify-Access-Token": JETON, "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }), cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    const j = await r.json();
    if (j.errors && JSON.stringify(j.errors).includes("THROTTLED")) { await new Promise((ok) => setTimeout(ok, 1000 * (i + 1))); continue; }
    if (j.errors) throw new Error(`Shopify : ${JSON.stringify(j.errors).slice(0, 200)}`);
    return j.data;
  }
  throw new Error("Shopify : trop de demandes");
}

async function historique(id: string): Promise<Commande[]> {
  const out: Commande[] = []; let c: string | null = null;
  for (;;) {
    const d = await gql(`query($id:ID!,$c:String){customer(id:$id){orders(first:50,after:$c){pageInfo{hasNextPage endCursor} nodes{createdAt cancelledAt lineItems(first:100){nodes{title variantTitle sku currentQuantity product{productType}}}}}}}`, { id: `gid://shopify/Customer/${id}`, c });
    const o = d.customer?.orders; if (!o) break;
    for (const n of o.nodes) out.push({ createdAt: n.createdAt, cancelledAt: n.cancelledAt, lignes: n.lineItems.nodes });
    if (!o.pageInfo.hasNextPage) break; c = o.pageInfo.endCursor;
  }
  return out;
}

async function ecrire(id: string) {
  const r = carnet(await historique(id));
  if (!r) return false;
  const owner = `gid://shopify/Customer/${id}`;
  const m: Record<string, string>[] = [];
  if (r.taille) m.push({ ownerId: owner, namespace: "custom", key: "carnet_taille", type: "number_integer", value: String(r.taille) });
  if (r.basesTxt) m.push({ ownerId: owner, namespace: "custom", key: "carnet_bases", type: "multi_line_text_field", value: r.basesTxt });
  if (r.anneauxTxt) m.push({ ownerId: owner, namespace: "custom", key: "carnet_anneaux", type: "single_line_text_field", value: r.anneauxTxt });
  m.push({ ownerId: owner, namespace: "custom", key: "carnet", type: "json", value: JSON.stringify(r.json) });
  const d = await gql(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}`, { m });
  if (d.metafieldsSet.userErrors.length) throw new Error(`fiche ${id} : ${d.metafieldsSet.userErrors[0].message}`);
  return true;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  const main = !!(cle && p.get("cle") === cle);
  if (!estCron(req) && !main) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  if (main && p.get("voir")) return NextResponse.json({ ok: true, carnet: carnet(await historique(p.get("voir")!)) });
  if (main && p.get("bilan") === "1") return NextResponse.json({ ok: true, dernier: await kv.get("carnet:bilan") });

  const fin = Date.now() + 250000;
  const debut = new Date().toISOString();
  // premier passage : on part du calcul complet du 13.11.2026
  const depuis = (await kv.get<string>("carnet:depuis")) ?? "2026-11-13T09:00:00Z";
  const file = new Set((await kv.get<string[]>("carnet:file")) ?? []);
  // commandes créées ou modifiées (remboursement, annulation…) depuis le dernier passage
  let c: string | null = null, commandes = 0;
  for (;;) {
    const d = await gql(`query($c:String,$q:String){orders(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{customer{legacyResourceId}}}}`, { c, q: `updated_at:>'${depuis}'` });
    for (const n of d.orders.nodes) { commandes++; if (n.customer) file.add(String(n.customer.legacyResourceId)); }
    if (!d.orders.pageInfo.hasNextPage) break; c = d.orders.pageInfo.endCursor;
  }
  let faites = 0; const erreurs: string[] = [];
  for (const id of [...file]) {
    if (Date.now() > fin) break;
    try { await ecrire(id); } catch (e) { erreurs.push(e instanceof Error ? e.message : String(e)); }
    file.delete(id); faites++;
  }
  await kv.set("carnet:depuis", debut);
  await kv.set("carnet:file", [...file]);
  const bilan = { quand: debut, depuis, commandes, faites, reste: file.size, erreurs: erreurs.slice(0, 5) };
  await kv.set("carnet:bilan", bilan, { ex: 7 * 86400 });
  return NextResponse.json({ ok: true, ...bilan });
}
