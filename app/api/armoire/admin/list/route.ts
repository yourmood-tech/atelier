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
  personnalise: boolean;   // a sauvé quelque chose
  objets: number;          // objets déco débloqués
  poses: number;           // objets réellement posés dans la chambre
  avatar: boolean;         // a un avatar
  moodailles: number;      // cartes gagnées
  staff: boolean;          // membre de l'équipe (@yourmood.net)
  aFait: boolean;          // a "fait" sa commood
};

export async function GET() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  if (!session || !email.endsWith("@yourmood.net")) {
    return NextResponse.json({ error: "Accès réservé à l'équipe Mood" }, { status: 401 });
  }

  try {
    const [seenK, ovK, unlK, wonK, roomK] = await Promise.all([
      scan("armoire:seen:*"),
      scan("armoire:ov:*"),
      scan("armoire:unlocks:*"),
      scan("moodwon:*"),
      scan("armoire:room:*"),
    ]);

    const map = new Map<string, Profile>();
    const get = (em: string): Profile => {
      const key = em.toLowerCase();
      if (!map.has(key)) map.set(key, { email: key, prenom: "", commandes: 0, visites: 0, derniere: null, personnalise: false, objets: 0, poses: 0, avatar: false, moodailles: 0, staff: key.endsWith("@yourmood.net"), aFait: false });
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
    for (const k of roomK) {
      const r = (await kv.get(k)) as { avatarImage?: string | null; placed?: string[]; active?: Record<string, string> } | null;
      const p = get(emailOf(k));
      p.avatar = !!r?.avatarImage;
      p.poses = Array.isArray(r?.placed) ? r!.placed.length : 0;
      if (p.poses > 0 || Object.keys(r?.active ?? {}).length > 0 || p.avatar) p.personnalise = true;
    }

    const list = [...map.values()];
    list.forEach((p) => { p.aFait = p.personnalise || p.objets > 0 || p.moodailles > 0 || p.poses > 0 || p.avatar; });

    const score = (p: Profile) => (p.aFait ? 1000 : 0) + p.moodailles * 50 + p.poses * 25 + p.objets * 20 + (p.avatar ? 40 : 0) + (p.personnalise ? 30 : 0) + p.visites;
    list.sort((a, b) => score(b) - score(a) || (b.derniere ?? "").localeCompare(a.derniere ?? ""));

    return NextResponse.json({
      total: list.filter((p) => !p.staff).length,
      aFait: list.filter((p) => p.aFait && !p.staff).length,
      clientes: list,
    });
  } catch (e) {
    console.error("[armoire/admin/list] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
