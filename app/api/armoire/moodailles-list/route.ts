import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Public (clientes) : liste des moodailles ACTIVES, pour l'espace armoire.
export type Moodaille = {
  id: string;
  nom: string;
  img: string;       // data URL ou URL
  avantage?: string; // ex. "-20% sur l'addon hibiscus"
  code?: string;     // code promo affiché sur la carte
  rarete?: string;   // commune | rare | epique
  jeu?: string;      // id du jeu qui la débloque
  actif?: boolean;
};

export async function GET() {
  const all = ((await kv.get("moodailles:catalog")) as Moodaille[] | null) ?? [];
  const actives = all.filter((m) => m.actif !== false);
  return NextResponse.json({ moodailles: actives }, { headers: { "Cache-Control": "no-store" } });
}
