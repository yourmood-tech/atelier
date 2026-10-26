// Calendrier de l'Avent 2026 — photos de chaque case, posées sur la fiche le jour J à minuit.
// Amila dépose les photos dans /calendrier-photos ; le réveil de minuit (/api/calendrier-reveil) les pose.
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { kv } from "@vercel/kv";

const SHOP = "yourmood.myshopify.com";
const API = `https://${SHOP}/admin/api/2025-01/graphql.json`;

export async function gq(query: string, variables?: unknown) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": process.env.SHOPIFY_API_TOKEN!, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

// même liste que la page du calendrier
export const CASES: { n: number; t: string; d: string }[] = [
  { n: 1, t: "Les douceurs", d: "deux tiers acier découpé" },
  { n: 2, t: "Rencontrent le givre", d: "6 mediums polymère" },
  { n: 3, t: "Le rouge apparaît", d: "pack de 2 minis alu rouge" },
  { n: 4, t: "Avec la neige", d: "deux tiers polymère translucide" },
  { n: 5, t: "Noël s'éveille", d: "deux tiers polymère opaque" },
  { n: 6, t: "Vêtu de bleu", d: "clip" },
  { n: 7, t: "Une lueur", d: "deux tiers nacre" },
  { n: 8, t: "Brille doucement", d: "deux tiers acier découpé" },
  { n: 9, t: "Le ciel s'embrase", d: "6 mediums polymère" },
  { n: 10, t: "Sur les Alpes", d: "deux tiers polymère opaque" },
  { n: 11, t: "Une lumière", d: "drop" },
  { n: 12, t: "Perce la nuit", d: "deux tiers alu myrtille" },
  { n: 13, t: "Sous le sapin", d: "deux tiers polymère translucide" },
  { n: 14, t: "La glace scintille", d: "Aura medium" },
  { n: 15, t: "Les cerfs avancent", d: "deux tiers alu abricot" },
  { n: 16, t: "Sous les étoiles", d: "pack de 2 minis alu myrtille" },
  { n: 17, t: "Un éclat", d: "clip" },
  { n: 18, t: "Traverse la forêt", d: "deux tiers acier bleu" },
  { n: 19, t: "Les flocons dansent", d: "deux tiers alu noisette serti" },
  { n: 20, t: "Dans le bleu", d: "deux tiers nacre" },
  { n: 21, t: "Noël scintille", d: "deux tiers acier rose gold" },
  { n: 22, t: "Une dernière fois", d: "drop" },
  { n: 23, t: "La magie commence", d: "Aura medium" },
  { n: 24, t: "À minuit", d: "deux tiers alu anthracite serti" },
];

export type Photos = {
  sansBase?: string; avecBase?: string; portee?: string; ambiance?: string[];
  gif?: string; gifDe?: string; // gifDe = les 2 photos qui ont servi au gif (pour le refaire si elles changent)
  publie?: string; erreur?: string;
};
export const cle = (n: number) => `calendrier2026:photos:${n}`;

// numéro de case → fiche Shopify (lu dans la sauvegarde des vrais noms)
export function fiches(): Record<number, string> {
  const p = path.join(process.cwd(), "prive", "calendrier-2026-vrais-noms.json");
  const sv = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, { titre: string }>;
  const out: Record<number, string> = {};
  for (const [id, f] of Object.entries(sv)) {
    const m = /^(\d{2}) /.exec(f.titre);
    if (m) out[Number(m[1])] = id;
  }
  return out;
}

// jour de décembre en Suisse (0 si on n'est pas en décembre 2026)
export function jourSuisse(d = new Date()): number {
  const s = new Intl.DateTimeFormat("fr-CH", { timeZone: "Europe/Zurich", year: "numeric", month: "numeric", day: "numeric" }).format(d);
  const [jj, mm, aaaa] = s.split(".").map(Number);
  return aaaa === 2026 && mm === 12 ? jj : 0;
}

export const pret = (p: Photos) => !!(p.sansBase && p.avecBase && p.portee);

// dépose un fichier dans les Fichiers Shopify → adresse permanente
export async function deposer(buf: Buffer, nom: string, mime: string): Promise<string> {
  const st = await gq(
    `mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}`,
    { input: [{ filename: nom, mimeType: mime, httpMethod: "POST", resource: "IMAGE", fileSize: String(buf.length) }] }
  );
  const t = st.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), nom);
  const up = await fetch(t.url, { method: "POST", body: form });
  if (!up.ok) throw new Error("dépôt refusé " + up.status);
  const c = await gq(
    `mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id ... on MediaImage{image{url}}} userErrors{message}}}`,
    { files: [{ originalSource: t.resourceUrl, contentType: "IMAGE", alt: nom }] }
  );
  const f = c.fileCreate.files[0];
  if (!f) throw new Error("fichier non créé " + JSON.stringify(c.fileCreate.userErrors));
  let url: string | null = f.image?.url || null;
  for (let i = 0; i < 15 && !url; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const q = await gq(`query($id:ID!){node(id:$id){... on MediaImage{image{url}}}}`, { id: f.id });
    url = q.node?.image?.url || null;
  }
  if (!url) throw new Error("adresse du fichier pas encore prête");
  return url;
}

// gif : produit sans base ↔ avec base, en fondu doux, carré 900 px
export async function faireGif(n: number, sansBase: string, avecBase: string): Promise<string> {
  const T = 900;
  const lire = async (u: string) => {
    const b = Buffer.from(await (await fetch(u)).arrayBuffer());
    return sharp(b).rotate().resize(T, T, { fit: "cover" }).removeAlpha().raw().toBuffer();
  };
  const [a, b] = await Promise.all([lire(sansBase), lire(avecBase)]);
  const melange = (x: number) => {
    const o = Buffer.alloc(a.length);
    for (let i = 0; i < a.length; i++) o[i] = Math.round(a[i] * (1 - x) + b[i] * x);
    return o;
  };
  const etapes = [0.2, 0.4, 0.6, 0.8];
  const images = [a, ...etapes.map(melange), b, ...etapes.slice().reverse().map(melange)];
  const delais = [1400, 70, 70, 70, 70, 1400, 70, 70, 70, 70];
  const pngs = await Promise.all(images.map((r) => sharp(r, { raw: { width: T, height: T, channels: 3 } }).png().toBuffer()));
  const gif = await sharp(pngs, { join: { animated: true } }).gif({ delay: delais, loop: 0, effort: 7 }).toBuffer();
  return deposer(gif, `calendrier-2026-${String(n).padStart(2, "0")}-gif.gif`, "image/gif");
}

// pose les photos sur la fiche : gif, portée, sans base, avec base (l'image surprise est retirée)
// + photos d'ambiance dans la description, juste après le premier paragraphe
export async function publier(n: number, p: Photos, productId: string) {
  const avant = await gq(`query($id:ID!){product(id:$id){descriptionHtml media(first:50){nodes{id}}}}`, { id: productId });
  const anciens: string[] = avant.product.media.nodes.map((m: { id: string }) => m.id);
  const nom = CASES[n - 1].t;
  const media = [p.gif, p.portee, p.sansBase, p.avecBase].filter(Boolean).map((u) => ({ originalSource: u, mediaContentType: "IMAGE", alt: nom }));
  const cr = await gq(
    `mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}`,
    { id: productId, m: media }
  );
  const e = cr.productCreateMedia.mediaUserErrors;
  if (e?.length) throw new Error("photos refusées : " + e[0].message);
  if (anciens.length) {
    await gq(`mutation($id:ID!,$m:[ID!]!){productDeleteMedia(productId:$id,mediaIds:$m){deletedMediaIds mediaUserErrors{message}}}`, { id: productId, m: anciens });
  }
  let html: string = avant.product.descriptionHtml || "";
  html = html.replace(/<!--cal-ambiance-->[\s\S]*?<!--\/cal-ambiance-->/, "");
  if (p.ambiance?.length) {
    const bloc = "<!--cal-ambiance-->" + p.ambiance.map((u) => `<p style="text-align:center"><img src="${u}" alt="${nom}" style="max-width:100%;height:auto"></p>`).join("") + "<!--/cal-ambiance-->";
    const i = html.indexOf("</p>");
    html = i >= 0 ? html.slice(0, i + 4) + bloc + html.slice(i + 4) : html + bloc;
  }
  const u = await gq(
    `mutation($input:ProductUpdateInput!){productUpdate(product:$input){product{id} userErrors{message}}}`,
    { input: { id: productId, descriptionHtml: html } }
  );
  if (u.productUpdate.userErrors?.length) throw new Error(u.productUpdate.userErrors[0].message);
}

// appelé par le réveil de minuit : toutes les cases dont le jour est arrivé, prêtes et pas encore posées
export async function publierDuJour(jour: number) {
  const ids = fiches();
  const faits: number[] = [];
  const rates: string[] = [];
  for (let n = 1; n <= Math.min(jour, 24); n++) {
    const p = ((await kv.get<Photos>(cle(n))) || {}) as Photos;
    if (p.publie || !pret(p) || !ids[n]) continue;
    try {
      await publier(n, p, ids[n]);
      await kv.set(cle(n), { ...p, publie: new Date().toISOString(), erreur: undefined });
      faits.push(n);
    } catch (err) {
      const m = String((err as Error).message).slice(0, 200);
      await kv.set(cle(n), { ...p, erreur: m });
      rates.push(`${n} : ${m}`);
    }
  }
  return { faits, rates };
}
