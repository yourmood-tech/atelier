import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire } from "@/lib/shopify";
import { isStaffEmail } from "@/lib/armoire-catalog";
import type { Moodaille } from "../moodailles-list/route";

// Jouer pour gagner une moodaille — TOUT est décidé côté serveur (anti-triche) :
// vérif email + n° de commande, UNE seule partie par jeu et par saison, tirage
// pondéré par rareté (le moins possible de rares / ultra-rares).

function digits(s: string): string { return (s || "").replace(/\D/g, ""); }

const POIDS: Record<string, number> = { commune: 70, rare: 22, epique: 6, ultrarare: 2 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const orderNumber = String(body?.orderNumber ?? "").trim();
    const jeu = String(body?.jeu ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(email) || !jeu) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    const staff = isStaffEmail(email);

    // Vérif de propriété (sauf staff) : email + n° de commande doivent correspondre.
    if (!staff) {
      if (!digits(orderNumber)) return NextResponse.json({ error: "Numéro de commande requis" }, { status: 400 });
      const armoire = await getCustomerArmoire(email);
      const owns = armoire.found && armoire.orderNames.some((n) => digits(n) === digits(orderNumber));
      if (!owns) return NextResponse.json({ error: "Email et commande ne correspondent pas", verified: false }, { status: 403 });
    }

    const saison = ((await kv.get("moodailles:saison")) as string | null) ?? "drop-1";
    const playKey = `moodplay:${email}:${jeu}:${saison}`;

    // Une seule partie par jeu et par saison (le staff peut rejouer pour tester).
    if (!staff && (await kv.get(playKey))) {
      return NextResponse.json({ already: true });
    }

    // Cartes actives de ce jeu, pas encore gagnées.
    const catalog = ((await kv.get("moodailles:catalog")) as Moodaille[] | null) ?? [];
    const won = ((await kv.get(`moodwon:${email}`)) as { id: string }[] | null) ?? [];
    const ownedIds = new Set(won.map((w) => w.id));
    const dispo = catalog.filter((m) => m.actif !== false && (!m.jeu || m.jeu === jeu) && !ownedIds.has(m.id));

    // On marque la partie comme jouée AVANT le tirage (même si rien à gagner, la partie est consommée).
    if (!staff) await kv.set(playKey, Date.now(), { ex: 60 * 60 * 24 * 120 });

    if (!dispo.length) {
      return NextResponse.json({ played: true, won: null, message: "Pas de nouvelle moodaille à gagner pour le moment 🤍" });
    }

    // Tirage pondéré par rareté.
    const total = dispo.reduce((s, m) => s + (POIDS[m.rarete || "commune"] ?? 10), 0);
    let r = Math.random() * total;
    let pick = dispo[0];
    for (const m of dispo) { r -= POIDS[m.rarete || "commune"] ?? 10; if (r <= 0) { pick = m; break; } }

    const entry = { id: pick.id, code: pick.code || "", saison, ts: Date.now() };
    if (!staff) await kv.set(`moodwon:${email}`, [...won, entry]);

    return NextResponse.json({ played: true, won: { id: pick.id, nom: pick.nom, img: pick.img, avantage: pick.avantage, code: pick.code, rarete: pick.rarete } });
  } catch (e) {
    console.error("[armoire/play] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
