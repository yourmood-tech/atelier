import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire, applyArmoireOverrides, tiroirChoices, type ArmoireOverrides } from "@/lib/shopify";

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
    if (!digits(orderNumber)) {
      return NextResponse.json({ error: "Numéro de commande manquant" }, { status: 400 });
    }

    const armoire = await getCustomerArmoire(email);
    if (!armoire.found) {
      return NextResponse.json({ found: false });
    }

    // Vérification de propriété : le n° fourni doit matcher une commande de CETTE cliente
    const wanted = digits(orderNumber);
    const owns = armoire.orderNames.some((n) => digits(n) === wanted);
    if (!owns) {
      return NextResponse.json({ found: true, verified: false });
    }

    // Personnalisations de la cliente (déplacer / photo perso)
    const overrides = (await kv.get(`armoire:ov:${email.toLowerCase()}`)) as ArmoireOverrides | null;
    const perso = applyArmoireOverrides(armoire, overrides);

    // Déblocages choisis (jeux + déco)
    const unlocks = ((await kv.get(`armoire:unlocks:${email.toLowerCase()}`)) as {
      games: string[];
      deco: string[];
    } | null) ?? { games: [], deco: [] };

    return NextResponse.json({
      found: true,
      verified: true,
      prenom: perso.prenom,
      stats: perso.stats,
      tiroirs: perso.tiroirs,
      choices: tiroirChoices(),
      entitlements: perso.entitlements,
      unlocks,
    });
  } catch (e) {
    console.error("[armoire/verify] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
