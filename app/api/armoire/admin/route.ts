import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCustomerArmoire } from "@/lib/shopify";
import { buildJeu } from "@/lib/armoire-jeu";

// Vue admin (staff Mood) — accès à l'armoire de N'IMPORTE QUEL client.
// Protégée par la connexion Google @yourmood.net (middleware) + double contrôle ici.

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  if (!session || !email.endsWith("@yourmood.net")) {
    return NextResponse.json({ error: "Accès réservé à l'équipe Mood" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const clientEmail = String(body?.email ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(clientEmail)) {
      return NextResponse.json({ error: "Email client invalide" }, { status: 400 });
    }

    const armoire = await getCustomerArmoire(clientEmail);
    if (!armoire.found) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      prenom: armoire.prenom,
      stats: armoire.stats,
      tiroirs: armoire.tiroirs,
      orderNames: armoire.orderNames,
      jeu: buildJeu(armoire),
    });
  } catch (e) {
    console.error("[armoire/admin] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
