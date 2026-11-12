import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { calculerProfils, collecter, ecrire, indexer, indexPret, rafraichirHebdo } from "@/lib/compteur/moteur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Compteur anti-saturation (Mood Cash Engine, étage 1 — décisions de Philippe du 12.11.2026).
// Toutes les 15 minutes : lit les messages partis de Klaviyo, compte par cliente sur 7 jours, repère les
// profils (normale 5 / addict 10 / super-addict 14 / « une par semaine » 2) et écrit le résultat sur la fiche
// Shopify (yourmood, sinon mood joaillerie), ou sur le profil Klaviyo quand la personne n'a pas de fiche.
// MODE OBSERVATION : n'appose AUCUNE étiquette « au-repos » et ne bloque aucun envoi.
// Lancement à la main : ?cle=… (SAV_POSTE_CLE) ; &essai=1 = lit et calcule, n'écrit rien.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  if (!estCron(req) && !(cle && p.get("cle") === cle)) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  // l'écriture sur les fiches ne démarre qu'après contrôle à la main : ?cle=…&autoriser=1 (ou &autoriser=0 pour la couper)
  if (p.get("autoriser") === "1" || p.get("autoriser") === "0") {
    if (p.get("autoriser") === "1") await kv.set("cpt:ecriture-ok", new Date().toISOString()); else await kv.del("cpt:ecriture-ok");
    return NextResponse.json({ ok: true, ecriture: p.get("autoriser") === "1" ? "autorisée" : "coupée" });
  }
  if (p.get("bilan") === "1") return NextResponse.json({ ok: true, dernier: await kv.get("cpt:dernier-bilan"), ecriture: (await kv.get("cpt:ecriture-ok")) ? "autorisée" : "pas encore autorisée" });
  const autorise = !!(await kv.get("cpt:ecriture-ok"));
  const essai = p.get("essai") === "1";
  // une seule tranche à la fois
  if (!essai && !(await kv.set("cpt:verrou", Date.now(), { nx: true, ex: 290 }))) return NextResponse.json({ ok: true, raison: "une tranche tourne déjà" });
  const montre = { fin: Date.now() + 270000 };
  const bilan: Record<string, unknown> = { essai };
  try {
    bilan.collecte = await collecter({ fin: Math.min(montre.fin, Date.now() + 120000) }, essai);
    bilan.hebdo = await rafraichirHebdo(essai);
    bilan.index = await indexer({ fin: Math.min(montre.fin, Date.now() + 90000) }, essai);
    // les profils et l'écriture attendent que l'index des fiches soit complet (sinon tout partirait sur Klaviyo)
    if (await indexPret()) {
      bilan.profils = await calculerProfils(essai);
      bilan.ecriture = await ecrire(montre, essai || !autorise);
      if (!autorise && !essai) bilan.ecriture = { ...(bilan.ecriture as object), note: "calculé seulement : écriture pas encore autorisée" };
    } else bilan.ecriture = "en attente : premier parcours des fiches Shopify pas terminé";
    if (!essai) await kv.set("cpt:dernier-bilan", { quand: new Date().toISOString(), ...bilan }, { ex: 7 * 86400 });
    return NextResponse.json({ ok: true, ...bilan });
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e), ...bilan }, { status: 500 });
  } finally {
    if (!essai) await kv.del("cpt:verrou");
  }
}
