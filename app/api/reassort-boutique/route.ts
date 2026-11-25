import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ajuster, boutiques, brouillons, creer, enregistrerLignes, interpreter, lire, sauverEnCours, supprimer, valider, valides } from "@/lib/reassort-boutique";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Réassort boutique (page /reassort-boutique, derrière la connexion @yourmood.net).
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const qui = session?.user?.email ?? "";
    if (!qui) return NextResponse.json({ ok: false, erreur: "Connecte-toi d'abord." }, { status: 401 });
    const b = await req.json();
    switch (b.action) {
      case "accueil": {
        const bid = b.boutiqueId != null ? Number(b.boutiqueId) : undefined;
        const liste = await boutiques();
        const nom = liste.find((x) => x.id === bid)?.nom;
        return NextResponse.json({ ok: true, qui, boutiques: liste.map(({ id, nom }) => ({ id, nom })),
          brouillons: bid != null ? await brouillons(bid) : [], valides: nom ? (await valides(nom)).slice(0, 10) : [] });
      }
      case "creer": return NextResponse.json({ ok: true, brouillon: await creer({ id: Number(b.boutique.id), nom: String(b.boutique.nom) }, qui) });
      case "lire": return NextResponse.json({ ok: true, brouillon: await lire(String(b.id)) });
      case "interpreter": {
        const phrase = String(b.phrase ?? "").trim();
        if (!phrase) return NextResponse.json({ ok: false, erreur: "Écris ou dicte ce que tu veux commander." }, { status: 400 });
        return NextResponse.json({ ok: true, ...(await interpreter(phrase)) });
      }
      case "lignes": return NextResponse.json({ ok: true, brouillon: await enregistrerLignes(String(b.id), b.lignes ?? [], b.phrase ? String(b.phrase) : undefined) });
      case "ajuster": return NextResponse.json({ ok: true, ...(await ajuster(String(b.phrase ?? ""), b.etat ?? { propositions: [], panier: [] })) });
      case "encours": return NextResponse.json({ ok: true, le: await sauverEnCours(String(b.id), String(b.phrase ?? ""), Array.isArray(b.props) ? b.props : []) });
      case "supprimer": await supprimer(String(b.id)); return NextResponse.json({ ok: true });
      case "valider": return NextResponse.json({ ok: true, ...(await valider(String(b.id), qui)) });
      default: return NextResponse.json({ ok: false, erreur: "action inconnue" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
