import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";

// Liste des comptes clientes ayant une commood "vivante" (ouverte et/ou personnalisée).
// Réservé à l'équipe Mood (@yourmood.net). Trie en tête celles qui ont fait leur commood.

async function scan(pattern: string): Promise<string[]> {
  let cur = 0;
  const out: string[] = [];
  do {
    const [next, keys] = (await kv.scan(cur, { match: pattern, count: 500 })) as unknown as [number, string[]];
    cur = Number(next);
    out.push(...keys);
  } while (cur !== 0);
  return out;
}
const emailOf = (k: string) => k.split(":").slice(-1)[0];

type Profile = {
  email: string;
  prenom: string;
  commandes: number;
  visites: number;
  derniere: string | null;
  personnalise: boolean;   // a sauvé de la déco
  objets: number;          // objets déco débloqués
  moodailles: number;      // cartes gagnées
  aFait: boolean;          // a "fait" sa commood
};

export async function GET() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  if (!session || !email.endsWith("@yourmood.net")) {
    return NextResponse.json({ error: "Accès réservé à l'équipe Mood" }, { status: 401 });
  }

  try {
    const [seenK, ovK, unlK, wonK] = await Promise.all([
      scan("armoire:seen:*"),
      scan("armoire:ov:*"),
      scan("armoire:unlocks:*"),
      scan("moodwon:*"),
    ]);

    const map = new Map<string, Profile>();
    const get = (em: string): Profile => {
      const key = em.toLowerCase();
      if (!map.has(key)) map.set(key, { email: key, prenom: "", commandes: 0, visites: 0, derniere: null, personnalise: false, objets: 0, moodailles: 0, aFait: false });
      return map.get(key)!;
    };

    for (const k of seenK) {
      const s = (await kv.get(k)) as { count?: number; last?: string; prenom?: string; commandes?: number } | null;
      const p = get(emailOf(k));
      p.visites = s?.count ?? 0;
      p.derniere = s?.last ?? null;
      if (s?.prenom) p.prenom = s.prenom;
      if (typeof s?.commandes === "number") p.commandes = s.commandes;
    }
    for (const k of ovK) { get(emailOf(k)).personnalise = true; }
    for (const k of unlK) {
      const u = (await kv.get(k)) as { deco?: string[] } | null;
      get(emailOf(k)).objets = u?.deco?.length ?? 0;
    }
    for (const k of wonK) {
      const w = (await kv.get(k)) as unknown[] | null;
      get(emailOf(k)).moodailles = Array.isArray(w) ? w.length : 0;
    }

    const staff = new Set(["amila@yourmood.net", "stephanie@yourmood.net"]);
    const list = [...map.values()].filter((p) => !staff.has(p.email));
    list.forEach((p) => { p.aFait = p.personnalise || p.objets > 0 || p.moodailles > 0; });

    const score = (p: Profile) => (p.aFait ? 1000 : 0) + p.moodailles * 50 + p.objets * 20 + (p.personnalise ? 30 : 0) + p.visites;
    list.sort((a, b) => score(b) - score(a) || (b.derniere ?? "").localeCompare(a.derniere ?? ""));

    return NextResponse.json({
      total: list.length,
      aFait: list.filter((p) => p.aFait).length,
      clientes: list,
    });
  } catch (e) {
    console.error("[armoire/admin/list] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
