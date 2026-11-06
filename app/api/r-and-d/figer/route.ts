// Tâche automatique : chaque mercredi à minuit (heure suisse), bloque les chiffres de la semaine qui vient de finir.
import { NextRequest, NextResponse } from "next/server";
import { estCron } from "@/lib/est-cron";
import { GET as semaine } from "../semaine/route";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!estCron(req)) return NextResponse.json({ error: "réservé à la tâche automatique" }, { status: 401 });
  const jour = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
  const depuisJeudi = (jour.getDay() - 4 + 7) % 7;
  const jeudiCourant = new Date(jour); jeudiCourant.setDate(jour.getDate() - depuisJeudi);
  const debut = new Date(jeudiCourant); debut.setDate(jeudiCourant.getDate() - 7); // la semaine qui vient de se terminer
  const iso = `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, "0")}-${String(debut.getDate()).padStart(2, "0")}`;
  const r = await semaine(new Request(`https://x/api/r-and-d/semaine?debut=${iso}`));
  const j = await r.json();
  return NextResponse.json({ semaine: iso, ok: !j.error, source: j.source || "calcul", erreur: j.error || null });
}
