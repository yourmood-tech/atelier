import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { estCron } from "@/lib/est-cron";
import { jourSuisse } from "@/lib/compteur/regles";
import { calculer, commandes, demandesLib, ouvertures } from "@/lib/compteur/libres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Liste « sans plafond » du compteur (décision Philippe + Stéphanie du 14.11.2026) — chaque heure, ne travaille
// que tant que la liste du jour n'est pas complète (rattrapage des 90 jours d'ouvertures par tranches).
// À la main : ?cle=<SAV_POSTE_CLE>&bilan=1 (état) ; &forcer=1 (recalcule même si la liste du jour est faite).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const cle = process.env.SAV_POSTE_CLE;
  const main = !!(cle && p.get("cle") === cle);
  if (!estCron(req) && !main) return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  if (main && p.get("bilan") === "1") return NextResponse.json({ ok: true, dernier: await kv.get("lib:bilan") });
  const fait = await kv.get<{ jour: string; detail?: { joursOuverture?: number } }>("cpt2:libres");
  const complet = fait?.jour === jourSuisse(new Date()) && (fait.detail?.joursOuverture ?? 0) >= 89;
  if (complet && !(main && p.get("forcer") === "1")) return NextResponse.json({ ok: true, raison: "liste du jour déjà faite" });
  if (!(await kv.set("lib:verrou", Date.now(), { nx: true, ex: 290 }))) return NextResponse.json({ ok: true, raison: "un calcul tourne déjà" });
  demandesLib.n = 3;
  const montre = { fin: Date.now() + 260000 };
  const bilan: Record<string, unknown> = {};
  try {
    bilan.commandes = await commandes();
    bilan.ouvertures = await ouvertures({ fin: montre.fin - 40000 });
    bilan.liste = await calculer(montre);
    bilan.demandesStockage = demandesLib.n + 2;
    await kv.set("lib:bilan", { quand: new Date().toISOString(), ...bilan }, { ex: 7 * 86400 });
    return NextResponse.json({ ok: true, ...bilan });
  } catch (e) {
    await kv.set("lib:bilan", { quand: new Date().toISOString(), erreur: e instanceof Error ? e.message : String(e), ...bilan }, { ex: 7 * 86400 });
    return NextResponse.json({ erreur: e instanceof Error ? e.message : String(e), ...bilan }, { status: 500 });
  } finally {
    await kv.del("lib:verrou");
  }
}
