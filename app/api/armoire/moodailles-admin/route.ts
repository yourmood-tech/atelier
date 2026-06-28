import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import type { Moodaille } from "../moodailles-list/route";

// Admin (toi + Stéphanie, @yourmood.net) : gérer les moodailles au jour le jour.
const KEY = "moodailles:catalog";

async function guard() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  if (!session || !email.endsWith("@yourmood.net")) return null;
  return email;
}

export async function POST(req: NextRequest) {
  const email = await guard();
  if (!email) return NextResponse.json({ error: "Accès réservé à l'équipe Mood" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const all = ((await kv.get(KEY)) as Moodaille[] | null) ?? [];

  if (action === "list") {
    return NextResponse.json({ moodailles: all });
  }

  if (action === "save") {
    const m = body?.moodaille as Moodaille;
    if (!m?.nom || !m?.img) return NextResponse.json({ error: "Nom et image requis" }, { status: 400 });
    const id = m.id && String(m.id).trim() ? String(m.id) : `m_${Date.now().toString(36)}`;
    const jeux = Array.isArray(m.jeux) ? m.jeux.map(String) : (m.jeu ? [String(m.jeu)] : []);
    const entry: Moodaille = {
      id,
      nom: String(m.nom).trim(),
      img: String(m.img),
      icone: m.icone ? String(m.icone) : "",
      avantage: m.avantage ? String(m.avantage).trim() : "",
      code: m.code ? String(m.code).trim() : "",
      rarete: m.rarete ? String(m.rarete) : "commune",
      jeux,
      jeu: jeux[0] ?? "",
      actif: m.actif !== false,
    };
    const idx = all.findIndex((x) => x.id === id);
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    await kv.set(KEY, all);
    return NextResponse.json({ ok: true, moodaille: entry, moodailles: all });
  }

  if (action === "delete") {
    const id = String(body?.id ?? "");
    const next = all.filter((x) => x.id !== id);
    await kv.set(KEY, next);
    return NextResponse.json({ ok: true, moodailles: next });
  }

  // Saison courante (le "drop") : change-la pour réinitialiser les parties de tout le monde.
  if (action === "getSaison") {
    const saison = ((await kv.get("moodailles:saison")) as string | null) ?? "drop-1";
    return NextResponse.json({ saison });
  }
  if (action === "setSaison") {
    const saison = String(body?.saison ?? "").trim() || "drop-1";
    await kv.set("moodailles:saison", saison);
    return NextResponse.json({ ok: true, saison });
  }

  // Révoquer la carte d'une cliente (partage interdit → code annulé).
  if (action === "revoke") {
    const clientEmail = String(body?.email ?? "").trim().toLowerCase();
    const cardId = String(body?.cardId ?? "");
    if (!clientEmail || !cardId) return NextResponse.json({ error: "Email cliente + carte requis" }, { status: 400 });
    const won = ((await kv.get(`moodwon:${clientEmail}`)) as { id: string }[] | null) ?? [];
    const next = won.filter((w) => w.id !== cardId);
    await kv.set(`moodwon:${clientEmail}`, next);
    return NextResponse.json({ ok: true, restantes: next.length });
  }

  // Voir ce qu'une cliente a gagné.
  if (action === "wonOf") {
    const clientEmail = String(body?.email ?? "").trim().toLowerCase();
    const won = ((await kv.get(`moodwon:${clientEmail}`)) as { id: string; code?: string; saison?: string; ts?: number }[] | null) ?? [];
    return NextResponse.json({ won });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
