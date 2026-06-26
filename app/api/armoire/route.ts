import { NextRequest, NextResponse } from "next/server";
import { getCustomerArmoire } from "@/lib/shopify";

// Mon Armoire Mood — espace client (V1)
// POST { email, prenom? } → armoire (vraies commandes) + jeu de vignettes.
// Aucune donnée inventée : tout vient des commandes Shopify de la cliente.

// L'album-test de la V1 : la collection Hibiscus (6 vignettes).
const ALBUM = {
  nom: "Collection Hibiscus",
  emoji: "🌺",
  vignettes: [
    { id: "hib-1", nom: "Pétale", emoji: "🌸" },
    { id: "hib-2", nom: "Rubis", emoji: "❤️" },
    { id: "hib-3", nom: "Corail", emoji: "🪸" },
    { id: "hib-4", nom: "Nacre", emoji: "🤍" },
    { id: "hib-5", nom: "Or chaud", emoji: "✨" },
    { id: "hib-6", nom: "Fleur rare", emoji: "💎" },
  ],
};

// On gagne en achetant (3 vignettes / commande) + en participant (mood du jour, côté appli).
const VIGNETTES_PAR_COMMANDE = 3;

// Paliers de saison (récompense = vraie carotte Mood)
const PALIERS = [
  { seuil: 150, recompense: "Une mini offerte à ta prochaine compo" },
  { seuil: 300, recompense: "Accès en avant-première aux pépites" },
  { seuil: 500, recompense: "Gravure offerte + statut Mood Lover VIP" },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const armoire = await getCustomerArmoire(email);

    if (!armoire.found) {
      return NextResponse.json({ found: false });
    }

    const vignettesAchat = armoire.stats.commandes * VIGNETTES_PAR_COMMANDE;

    // Palier courant / prochain selon le total dépensé
    const depense = armoire.stats.totalDepense;
    const prochain = PALIERS.find((p) => depense < p.seuil) ?? null;
    const atteints = PALIERS.filter((p) => depense >= p.seuil);

    return NextResponse.json({
      found: true,
      prenom: armoire.prenom || String(body?.prenom ?? ""),
      stats: armoire.stats,
      tiroirs: armoire.tiroirs,
      jeu: {
        album: ALBUM,
        vignettesAchat,
        palier: {
          depense,
          devise: armoire.stats.devise,
          prochain,
          recompensesDebloquees: atteints.map((p) => p.recompense),
        },
      },
    });
  } catch (e) {
    console.error("[armoire] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
