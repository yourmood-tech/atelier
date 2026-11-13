import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { analyser, passage } from "@/lib/pepites/moteur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Moteur des pépites créatives — chaque matin (tâche planifiée). Ne fait que des BROUILLONS Klaviyo, jamais d'envoi.
// À la main (?cle=<SAV_POSTE_CLE>) :
//   &actif=1 / &actif=0            le passage du matin crée les brouillons / calcule seulement (coupé par défaut)
//   &voir=<numéro produit>          analyse d'une pièce (stock réel, clientes visées), sans rien créer
//   &produit=<numéro>&creer=1       prépare les brouillons pour cette pièce
//   &bilan=1                        dernier rapport
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  const main = !!(cle && p.get("cle") === cle);
  if (!estCron(req) && !main) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  if (main && (p.get("actif") === "1" || p.get("actif") === "0")) {
    if (p.get("actif") === "1") await kv.set("pepites:actif", new Date().toISOString()); else await kv.del("pepites:actif");
    return NextResponse.json({ ok: true, actif: p.get("actif") === "1" });
  }
  if (main && p.get("bilan") === "1") return NextResponse.json({ ok: true, actif: !!(await kv.get("pepites:actif")), dernier: await kv.get("pepites:rapport") });
  const fin = Date.now() + 240000;
  try {
    if (main && p.get("voir")) return NextResponse.json({ ok: true, analyse: await analyser(`gid://shopify/Product/${p.get("voir")}`) });
    if (main && p.get("produit")) return NextResponse.json({ ok: true, ...(await passage({ creer: p.get("creer") === "1", fin, produit: p.get("produit")! })) });
    const actif = !!(await kv.get("pepites:actif"));
    return NextResponse.json({ ok: true, ...(await passage({ creer: actif, fin })) });
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
