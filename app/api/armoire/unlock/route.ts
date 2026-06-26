import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire } from "@/lib/shopify";
import { gameById, decoById } from "@/lib/armoire-catalog";

// Déblocage d'un jeu ou d'un objet déco "à choix", dans la limite du budget
// gagné par les commandes (depuis le lancement). Sauvegardé par cliente.
// Sécurité : email + numéro de commande doivent correspondre.

type Unlocks = { games: string[]; deco: string[] };
const unlockKey = (email: string) => `armoire:unlocks:${email.trim().toLowerCase()}`;
const digits = (s: string) => (s || "").replace(/\D/g, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const orderNumber = String(body?.orderNumber ?? "").trim();
    const kind = String(body?.kind ?? ""); // "game" | "deco"
    const id = String(body?.id ?? "");
    const action = String(body?.action ?? "unlock"); // "unlock" | "remove"
    if (!/\S+@\S+\.\S+/.test(email) || !digits(orderNumber) || !["game", "deco"].includes(kind) || !id) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const valid = kind === "game" ? gameById(id) : decoById(id);
    if (!valid) return NextResponse.json({ error: "Élément inconnu" }, { status: 400 });

    const armoire = await getCustomerArmoire(email);
    if (!armoire.found || !armoire.orderNames.some((n) => digits(n) === digits(orderNumber))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const k = unlockKey(email);
    const cur = ((await kv.get(k)) as Unlocks | null) ?? { games: [], deco: [] };
    cur.games = Array.isArray(cur.games) ? cur.games : [];
    cur.deco = Array.isArray(cur.deco) ? cur.deco : [];

    const list = kind === "game" ? cur.games : cur.deco;
    const budget = kind === "game" ? armoire.entitlements.gamesBudget : armoire.entitlements.decoBudget;

    if (action === "remove") {
      const idx = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1);
    } else {
      if (list.includes(id)) {
        // déjà débloqué — rien à faire
      } else if (list.length >= budget) {
        return NextResponse.json({ error: "Budget épuisé", unlocks: cur, budget }, { status: 409 });
      } else {
        list.push(id);
      }
    }

    await kv.set(k, cur);
    return NextResponse.json({ ok: true, unlocks: cur });
  } catch (e) {
    console.error("[armoire/unlock] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
