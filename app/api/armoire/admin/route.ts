import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { getCustomerArmoire, applyArmoireOverrides, type ArmoireOverrides } from "@/lib/shopify";

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

    const overrides = (await kv.get(`armoire:ov:${clientEmail.toLowerCase()}`)) as ArmoireOverrides | null;
    const perso = applyArmoireOverrides(armoire, overrides);
    const unlocks = ((await kv.get(`armoire:unlocks:${clientEmail.toLowerCase()}`)) as {
      games: string[];
      deco: string[];
    } | null) ?? { games: [], deco: [] };

    // Chambre sauvegardée (avatar + déco posée) pour reconstituer son univers.
    const room = (await kv.get(`armoire:room:${clientEmail.toLowerCase()}`)) as unknown | null;

    return NextResponse.json({
      found: true,
      prenom: perso.prenom,
      stats: perso.stats,
      tiroirs: perso.tiroirs,
      orderNames: perso.orderNames,
      entitlements: perso.entitlements,
      unlocks,
      room,
    });
  } catch (e) {
    console.error("[armoire/admin] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
