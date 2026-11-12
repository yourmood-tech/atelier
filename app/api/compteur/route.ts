import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { Armoire, collecteAJour, collecter, demandes, ecrire, hebdo, indexer, indexPret, menageV1, trace } from "@/lib/compteur/moteur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Compteur anti-saturation v2 — ÉCONOME (Mood Cash Engine, étage 1 ; règles de Philippe du 12.11.2026).
// MODE OBSERVATION : aucune étiquette « au-repos », aucun envoi bloqué.
// Interrupteurs (à la main, ?cle=<SAV_POSTE_CLE>) :
//   &actif=1 / &actif=0         la tâche planifiée tourne / ne tourne pas (arrêt par défaut)
//   &autoriser=1 / &autoriser=0 écriture sur les fiches Shopify / Klaviyo (verrouillée par défaut)
//   &bilan=1                    dernier bilan (dont le nombre de demandes au stockage)
//   &essai=1                    lit et calcule, n'écrit rien nulle part
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  const main = !!(cle && p.get("cle") === cle);
  if (!estCron(req) && !main) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  for (const [param, k] of [["actif", "cpt2:actif"], ["autoriser", "cpt2:ecriture-ok"]] as const) {
    if (main && (p.get(param) === "1" || p.get(param) === "0")) {
      if (p.get(param) === "1") await kv.set(k, new Date().toISOString()); else await kv.del(k);
      return NextResponse.json({ ok: true, [param]: p.get(param) === "1" });
    }
  }
  if (main && p.get("taille") === "1") {
    const t: number[] = [];
    for (let i = 0; i < 32; i++) t.push(Number(await kv.strlen(`cpt2:c:${i}`)));
    const trace = await kv.get("cpt2:trace");
    return NextResponse.json({ ok: true, octetsParClasseur: t, total: t.reduce((a, b) => a + b, 0), trace });
  }
  if (main && p.get("bilan") === "1") {
    const [b, a, e] = await kv.mget("cpt2:bilan", "cpt2:actif", "cpt2:ecriture-ok");
    return NextResponse.json({ ok: true, actif: !!a, ecriture: !!e, dernier: b });
  }
  const essai = p.get("essai") === "1";
  if (!main && !(await kv.get("cpt2:actif"))) return NextResponse.json({ ok: true, raison: "compteur à l'arrêt" });
  if (!essai && !(await kv.set("cpt2:verrou", Date.now(), { nx: true, ex: 290 }))) return NextResponse.json({ ok: true, raison: "une tranche tourne déjà" });
  demandes.n = 4;
  const montre = { fin: Date.now() + 270000 };
  const bilan: Record<string, unknown> = { essai };
  try {
    if (!essai) bilan.menageV1 = await menageV1();
    const armoire = new Armoire();
    const pret = await indexPret();
    bilan.collecte = await collecter({ fin: pret ? montre.fin - 60000 : Date.now() + 120000 }, armoire, essai);
    await trace("index des fiches");
    if (!pret) bilan.index = await indexer({ fin: Math.min(montre.fin, Date.now() + 90000) }, essai);
    else bilan.index = await indexer({ fin: Date.now() + 45000 }, essai); // nouvelles fiches seulement
    await trace("contrôle du rattrapage");
    const ajour = await collecteAJour();
    if (pret && ajour) {
      const autorise = !!(await kv.get("cpt2:ecriture-ok")); demandes.n++;
      await trace("liste hebdo"); const h = await hebdo(essai);
      await trace("calcul et écriture");
      bilan.ecriture = await ecrire(montre, armoire, h, essai || !autorise);
      if (!autorise && !essai) bilan.note = "calculé seulement : écriture sur les fiches pas encore autorisée";
    } else bilan.ecriture = !pret ? "en attente : index des fiches Shopify" : "en attente : premier rattrapage des messages et des clics";
    bilan.demandesStockage = demandes.n + 2;
    if (!essai) await kv.set("cpt2:bilan", { quand: new Date().toISOString(), ...bilan }, { ex: 7 * 86400 });
    return NextResponse.json({ ok: true, ...bilan });
  } catch (e) {
    if (!essai) await kv.set("cpt2:bilan", { quand: new Date().toISOString(), erreur: e instanceof Error ? e.message : String(e), ...bilan }, { ex: 7 * 86400 });
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e), ...bilan, demandesStockage: demandes.n }, { status: 500 });
  } finally {
    if (!essai) await kv.del("cpt2:verrou");
  }
}
