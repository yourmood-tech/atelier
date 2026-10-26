import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { kv } from "@vercel/kv";
import { jourSuisse, publierDuJour } from "@/lib/calendrier-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHOP = "yourmood.myshopify.com";
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

// le 1er décembre 2026, heure suisse
const JOUR_J = new Date("2026-12-01T00:00:00+01:00");

async function gq(query: string, variables?: any) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

const CLE = "mood-calendrier-2026-reveil";

export async function GET(req: NextRequest) {
  const cle = req.nextUrl.searchParams.get("cle");
  const estCron = req.headers.get("x-vercel-cron") !== null;
  if (!estCron && cle !== CLE) {
    return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  }
  const forcer = req.nextUrl.searchParams.get("forcer") === "1";
  const essai = req.nextUrl.searchParams.get("essai") === "1";

  if (!forcer && Date.now() < JOUR_J.getTime()) {
    return NextResponse.json({ fait: false, raison: "pas encore le 1er décembre" });
  }

  // les vrais noms ne sont remis qu'UNE fois (sinon chaque nuit effacerait les photos d'ambiance des descriptions)
  const DEJA = "calendrier2026:reveil-fait";
  if (!forcer && !essai && (await kv.get(DEJA))) {
    const photos = await publierDuJour(jourSuisse());
    return NextResponse.json({ fait: true, noms: "déjà remis", photos });
  }

  const p = path.join(process.cwd(), "prive", "calendrier-2026-vrais-noms.json");
  const sv = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, any>;
  const ids = Object.keys(sv);
  if (essai) return NextResponse.json({ essai: true, fiches: ids.length });

  const faits: string[] = [];
  const rates: string[] = [];
  for (const id of ids) {
    const f = sv[id];
    try {
      const u = await gq(
        `mutation($input:ProductUpdateInput!){ productUpdate(product:$input){ product{ title } userErrors{ message } } }`,
        { input: { id, title: f.titre, handle: f.adresse, descriptionHtml: f.texte, tags: f.etiquettes, seo: f.seo } }
      );
      const e = u.productUpdate.userErrors;
      if (e && e.length) { rates.push(f.titre + " : " + e[0].message); continue; }
      faits.push(f.titre);
    } catch (err: any) {
      rates.push(f.titre + " : " + String(err.message).slice(0, 120));
    }
  }
  if (!rates.length) await kv.set(DEJA, new Date().toISOString());
  // puis les photos des cases dont le jour est arrivé
  const photos = await publierDuJour(jourSuisse());
  return NextResponse.json({ fait: true, remis: faits.length, rates, photos });
}
