// Calendrier de décembre : renvoie UNIQUEMENT les cases déjà ouvertes (jour ≤ aujourd'hui, heure suisse).
// Les cases à venir ne sortent jamais d'ici → la surprise reste entière, même en regardant le code de la page.
// ?jour=N (aperçu) n'est accepté que pour l'équipe connectée.
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { CASES, cle, fiches, gq, jourSuisse, type Photos } from "@/lib/calendrier-photos";

export const dynamic = "force-dynamic";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export async function OPTIONS() { return new NextResponse(null, { headers: CORS }); }

function jourDuCalendrier(): number {
  const j = jourSuisse(); if (j) return Math.min(j, 24);
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(new Date());
  return s > "2026-12-31" ? 24 : 0;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  let jour = jourDuCalendrier(); let apercu = false;
  const demande = u.searchParams.get("jour");
  if (demande !== null) {
    const session = await auth().catch(() => null);
    if (session) { jour = Math.max(0, Math.min(24, parseInt(demande, 10) || 0)); apercu = true; }
  }
  const vrais = JSON.parse(fs.readFileSync(path.join(process.cwd(), "prive", "calendrier-2026-vrais-noms.json"), "utf8")) as Record<string, { titre: string; adresse: string }>;
  const ids = fiches();
  const ouverts = CASES.filter((c) => c.n <= jour);

  // prix affichés (prix plein des fiches), gardés 1 h
  let prix = (await kv.get<Record<string, number>>("calendrier2026:prix-fiches")) || null;
  if (!prix && ouverts.length) {
    prix = {};
    try {
      const d = await gq(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{id priceRangeV2{minVariantPrice{amount}}}}}`, { ids: Object.values(ids) });
      for (const n of d.nodes || []) if (n) prix[n.id] = Math.round(parseFloat(n.priceRangeV2.minVariantPrice.amount));
      await kv.set("calendrier2026:prix-fiches", prix, { ex: 3600 });
    } catch { /* prix facultatif */ }
  }

  const jours = await Promise.all(ouverts.map(async (c) => {
    const id = ids[c.n]; const v = id ? vrais[id] : null;
    const ph = ((await kv.get<Photos>(cle(c.n))) || {}) as Photos;
    const nn = String(c.n).padStart(2, "0");
    return {
      n: c.n, nom: c.t, type: c.d,
      image: ph.gif || ph.avecBase || ph.sansBase || `https://mood-tools.yourmood.net/calendrier/cases/${nn}.jpg`,
      photo: ph.avecBase || ph.sansBase || null,
      url: v ? `https://www.yourmood.net/products/${v.adresse}` : null,
      prix: id && prix ? prix[id] || null : null,
    };
  }));
  return NextResponse.json({ jour, apercu, jours }, { headers: { ...CORS, "Cache-Control": apercu ? "no-store" : "public, max-age=60" } });
}
