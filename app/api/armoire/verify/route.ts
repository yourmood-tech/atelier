import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire, applyArmoireOverrides, tiroirChoices, type ArmoireOverrides } from "@/lib/shopify";
import { GAMES, DECO, isStaffEmail } from "@/lib/armoire-catalog";

// Espace client public — Mon Armoire Mood.
// Sécurité : on n'ouvre l'armoire que si email + numéro de commande correspondent
// tous les deux à une vraie commande de cette cliente. Personne ne peut donc
// ouvrir l'armoire d'une autre sans connaître son email ET un de ses n° de commande.

function digits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const orderNumber = String(body?.orderNumber ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const staff = isStaffEmail(email);

    // Les clientes doivent fournir un n° de commande ; le staff (preview illimité) non.
    if (!staff && !digits(orderNumber)) {
      return NextResponse.json({ error: "Numéro de commande manquant" }, { status: 400 });
    }

    const armoire = await getCustomerArmoire(email);
    if (!armoire.found && !staff) {
      return NextResponse.json({ found: false });
    }

    if (!staff) {
      // Vérification de propriété : le n° fourni doit matcher une commande de CETTE cliente
      const wanted = digits(orderNumber);
      const owns = armoire.orderNames.some((n) => digits(n) === wanted);
      if (!owns) {
        return NextResponse.json({ found: true, verified: false });
      }
    }

    // Personnalisations de la cliente (déplacer / photo perso)
    const overrides = (await kv.get(`armoire:ov:${email.toLowerCase()}`)) as ArmoireOverrides | null;
    const perso = applyArmoireOverrides(armoire, overrides);

    // Déblocages : staff = TOUT débloqué + budget illimité ; cliente = ce qu'elle a choisi.
    const unlocks = staff
      ? { games: GAMES.map((g) => g.id), deco: DECO.map((d) => d.id) }
      : ((await kv.get(`armoire:unlocks:${email.toLowerCase()}`)) as { games: string[]; deco: string[] } | null) ?? {
          games: [],
          deco: [],
        };
    const entitlements = staff
      ? { gamesBudget: GAMES.length, decoBudget: DECO.length, commandesQualifiantes: 0 }
      : perso.entitlements;

    // Moodailles gagnées (côté serveur, par cliente) — source de vérité, non falsifiable.
    const won = ((await kv.get(`moodwon:${email.toLowerCase()}`)) as { id: string; code?: string }[] | null) ?? [];
    // On ne livre la CARTE COMPLÈTE + le CODE qu'aux cartes RÉELLEMENT possédées par cette cliente.
    const catalog = ((await kv.get("moodailles:catalog")) as Array<Record<string, unknown>> | null) ?? [];
    const codeById: Record<string, string> = {};
    won.forEach((w) => { codeById[w.id] = w.code || ""; });
    const moodaillesOwned = won.map((w) => {
      const m = catalog.find((x) => x.id === w.id) || {};
      return {
        id: w.id,
        nom: (m.nom as string) || "Moodaille",
        img: (m.img as string) || "",
        icone: (m.icone as string) || "",
        avantage: (m.avantage as string) || "",
        rarete: (m.rarete as string) || "",
        code: codeById[w.id] || (m.code as string) || "",
      };
    });

    return NextResponse.json({
      found: true,
      verified: true,
      staff,
      prenom: perso.prenom || (staff ? "Amila" : ""),
      stats: perso.stats,
      tiroirs: perso.tiroirs,
      choices: tiroirChoices(),
      entitlements,
      unlocks,
      moodailles: won.map((w) => w.id),
      moodaillesOwned,
    });
  } catch (e) {
    console.error("[armoire/verify] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
