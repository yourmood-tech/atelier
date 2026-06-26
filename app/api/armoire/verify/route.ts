import { NextRequest, NextResponse } from "next/server";
import { getCustomerArmoire } from "@/lib/shopify";
import { buildJeu } from "@/lib/armoire-jeu";

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

    return NextResponse.json({
      found: true,
      verified: true,
      prenom: armoire.prenom,
      stats: armoire.stats,
      tiroirs: armoire.tiroirs,
      jeu: buildJeu(armoire),
    });
  } catch (e) {
    console.error("[armoire/verify] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
