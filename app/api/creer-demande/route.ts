import { NextResponse } from "next/server";

// Upstash Redis (alias Vercel KV)
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisFetch(path: string, body?: unknown) {
  const url = `${REDIS_URL}${path}`;
  const r = await fetch(url, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Redis ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

type Demande = {
  id: string;
  date: string;
  prenom: string;
  email: string;
  tel?: string;
  matiere?: string;
  couleur?: string;
  couleurNom?: string;
  message?: string;
  format?: string;
  taille?: string;
  svg?: string;
  nbElements?: number;
  prix?: number;
  niveau?: string;
  statut: "nouveau" | "lu" | "traite" | "archive";
};

export async function POST(req: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json({ error: "Persistance non configurée" }, { status: 503 });
  }

  let data: Partial<Demande>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!data.prenom || !data.email) {
    return NextResponse.json({ error: "Prénom et email requis" }, { status: 400 });
  }

  // Bornes raisonnables anti-spam (SVG max ~200KB, message max 1000 chars)
  if (data.svg && data.svg.length > 200_000) {
    return NextResponse.json({ error: "SVG trop volumineux" }, { status: 413 });
  }
  if (data.message && data.message.length > 1000) {
    data.message = data.message.slice(0, 1000);
  }

  const id = `dem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const demande: Demande = {
    id,
    date: new Date().toISOString(),
    prenom: String(data.prenom).slice(0, 100),
    email: String(data.email).slice(0, 200),
    tel: data.tel ? String(data.tel).slice(0, 50) : undefined,
    matiere: data.matiere ? String(data.matiere).slice(0, 50) : undefined,
    couleur: data.couleur ? String(data.couleur).slice(0, 50) : undefined,
    couleurNom: data.couleurNom ? String(data.couleurNom).slice(0, 50) : undefined,
    message: data.message,
    format: data.format ? String(data.format).slice(0, 50) : undefined,
    taille: data.taille ? String(data.taille).slice(0, 10) : undefined,
    svg: data.svg,
    nbElements: typeof data.nbElements === "number" ? data.nbElements : undefined,
    prix: typeof data.prix === "number" ? data.prix : undefined,
    niveau: data.niveau ? String(data.niveau).slice(0, 50) : undefined,
    statut: "nouveau",
  };

  try {
    // Stocker la demande individuelle
    await redisFetch(`/set/perso:demande:${id}`, JSON.stringify(demande));
    // Ajouter l'id à la liste (sorted set par timestamp)
    const ts = Date.now();
    await redisFetch(`/zadd/perso:demandes/${ts}/${id}`);
    return NextResponse.json({ ok: true, id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
