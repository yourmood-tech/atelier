import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Public (clientes) : liste des moodailles ACTIVES, pour l'espace armoire.
export type Moodaille = {
  id: string;
  nom: string;
  img: string;       // la CARTE (façon Pokémon) — affichée dans les jeux / le tableau
  icone?: string;    // l'ICÔNE — affichée dans le tiroir de la commood
  avantage?: string; // ex. "-20% sur l'addon hibiscus"
  code?: string;     // code promo affiché sur la carte
  rarete?: string;   // commune | rare | epique | ultrarare
  jeu?: string;      // (ancien) id d'UN jeu — gardé pour compat
  jeux?: string[];   // ids des jeux qui la débloquent (vide = tous)
  actif?: boolean;
};

export async function GET() {
  const all = ((await kv.get("moodailles:catalog")) as Moodaille[] | null) ?? [];
  const saison = ((await kv.get("moodailles:saison")) as string | null) ?? "drop-1";
  // PUBLIC : on ne livre JAMAIS le code ni la carte complète (qui porte le code imprimé).
  // Seulement de quoi teaser « à gagner » : icône + nom + avantage + rareté.
  // Le code + la carte complète ne sont renvoyés qu'aux cartes possédées (voir /verify).
  const teaser = all.map((m) => ({
    id: m.id,
    nom: m.nom,
    icone: m.icone || "",
    avantage: m.avantage || "",
    rarete: m.rarete || "",
    jeux: m.jeux ?? (m.jeu ? [m.jeu] : []),
    actif: m.actif,
  }));
  return NextResponse.json({ moodailles: teaser, saison }, { headers: { "Cache-Control": "no-store" } });
}
