// « Mes retouches » — garde chaque photo sortie de /retouche (Fichiers Shopify = adresse permanente)
// + bouton « Haute qualité » : agrandissement fidèle (Topaz via KIE), sans rien redessiner.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import sharp from "sharp";
import { deposer } from "@/lib/calendrier-photos";

export const runtime = "nodejs";
export const maxDuration = 300;

type Entree = { id: string; url: string; hq?: string; date: string; label?: string; qui?: string; l?: number; h?: number };
const CLE = "retouche:historique";
const KIE_KEY = process.env.KIE_API_KEY;
const JOBS = "https://api.kie.ai/api/v1/jobs";

const lire = async () => ((await kv.get<Entree[]>(CLE)) || []);
const ecrire = (l: Entree[]) => kv.set(CLE, l.slice(0, 3000));

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  return NextResponse.json({ photos: await lire() });
}

async function agrandir(url: string, facteur: string): Promise<Buffer> {
  if (!KIE_KEY) throw new Error("clé KIE absente");
  const cr = await fetch(`${JOBS}/createTask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KIE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "topaz/image-upscale", input: { image_url: url, upscale_factor: facteur } }),
  });
  const cj = await cr.json().catch(() => null);
  const taskId = cj?.data?.taskId;
  if (!taskId) throw new Error("KIE : " + (cj?.msg || JSON.stringify(cj).slice(0, 160)));
  const debut = Date.now();
  while (Date.now() - debut < 270000) {
    await new Promise((r) => setTimeout(r, 4000));
    const pr = await fetch(`${JOBS}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { Authorization: `Bearer ${KIE_KEY}` } });
    const d = (await pr.json().catch(() => null))?.data;
    const st = String(d?.state || "").toLowerCase();
    if (st === "success") {
      const rj = typeof d.resultJson === "string" ? JSON.parse(d.resultJson) : d.resultJson;
      const out = (rj?.resultUrls || rj?.result_urls || [])[0];
      if (!out) throw new Error("KIE : pas d'image en sortie");
      return Buffer.from(await (await fetch(out)).arrayBuffer());
    }
    if (st === "fail" || st === "failed") throw new Error("KIE : " + (d?.failMsg || d?.failCode || "échec"));
  }
  throw new Error("délai dépassé, réessaie dans un instant");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "demande illisible" }, { status: 400 });

  try {
    // 1) garder une nouvelle photo
    if (body.action === "garder") {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(String(body.image || ""));
      if (!m) return NextResponse.json({ error: "image manquante" }, { status: 400 });
      const buf = Buffer.from(m[2], "base64");
      const meta = await sharp(buf).metadata();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const ext = m[1] === "image/png" ? "png" : "jpg";
      const url = await deposer(buf, `retouche-${id}.${ext}`, m[1]);
      const e: Entree = { id, url, date: new Date().toISOString(), label: String(body.label || "").slice(0, 80), qui: session.user?.email || "", l: meta.width, h: meta.height };
      await ecrire([e, ...(await lire())]);
      return NextResponse.json({ ok: true, photo: e });
    }

    // 2) passer une photo en haute qualité
    if (body.action === "hq") {
      const liste = await lire();
      const e = liste.find((x) => x.id === body.id);
      if (!e) return NextResponse.json({ error: "photo introuvable" }, { status: 404 });
      if (e.hq) return NextResponse.json({ ok: true, photo: e });
      const cote = Math.max(e.l || 0, e.h || 0);
      const facteur = cote && cote <= 1200 ? "4" : "2";
      const grand = await agrandir(e.url, facteur);
      // JPEG très haute qualité : garde tous les détails sans dépasser la limite des Fichiers Shopify
      const jpg = await sharp(grand).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
      const mt = await sharp(jpg).metadata();
      const hq = await deposer(jpg, `retouche-${e.id}-hq.jpg`, "image/jpeg");
      const frais = await lire();
      const i = frais.findIndex((x) => x.id === e.id);
      if (i >= 0) { frais[i] = { ...frais[i], hq }; await ecrire(frais); }
      return NextResponse.json({ ok: true, photo: { ...e, hq }, taille: `${mt.width}×${mt.height}` });
    }

    // 3) retirer de la liste (le fichier reste dans Shopify)
    if (body.action === "retirer") {
      await ecrire((await lire()).filter((x) => x.id !== body.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error)?.message || err) }, { status: 500 });
  }
}
