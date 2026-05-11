import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "yourmood.net";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  return d.result || null;
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

type Demande = {
  prenom: string;
  email: string;
  tel?: string;
  message?: string;
  format: string;
  taille?: string;
  couleur: string;
  couleurNom: string;
  svg: string;
  nbElements?: number;
};

export async function POST(req: Request) {
  let data: Partial<Demande>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { prenom, email, format, couleur, couleurNom, taille, svg, tel, message, nbElements } = data;
  if (!prenom || !email || !format || !couleur || !svg) {
    return NextResponse.json({ error: "Champs requis manquants (prénom, email, format, couleur, design)" }, { status: 400 });
  }
  if (svg.length > 200_000) {
    return NextResponse.json({ error: "Design SVG trop volumineux" }, { status: 413 });
  }

  // Récupérer le mapping format/couleur → variant ID depuis Redis
  const variantsRaw = await redisGet("perso:shopify:variants");
  if (!variantsRaw) {
    return NextResponse.json({ error: "Produits Shopify non créés. L'équipe Mood doit aller sur /setup-perso." }, { status: 503 });
  }
  type VariantsMap = Record<string, { productId: number; handle: string; variants: Record<string, number> }>;
  const variantsMap: VariantsMap = JSON.parse(variantsRaw);
  const variantId = variantsMap[format]?.variants[`${couleur}-${taille}`];
  if (!variantId) {
    return NextResponse.json({ error: `Variant introuvable pour format=${format}, couleur=${couleur}, taille=${taille}` }, { status: 400 });
  }

  // Stocker le SVG dans Redis avec un ID unique → URL publique
  const designId = `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await redisSet(`perso:design:${designId}`, svg);
  const designUrl = `https://mood-tools.yourmood.net/api/design/${designId}`;

  // Construire le permalink Shopify cart avec line item properties
  // Format : https://{shop}/cart/{variantId}:{quantity}?attributes[Key]=Value...
  // Note : pour line item properties, on utilise les "cart attributes" qui apparaissent sur la commande
  const props = new URLSearchParams();
  props.set("attributes[Format]", format);
  props.set("attributes[Couleur]", couleurNom || couleur);
  props.set("attributes[Taille]", taille || "");
  props.set("attributes[Prenom]", prenom);
  props.set("attributes[Email]", email);
  if (tel) props.set("attributes[Telephone]", tel);
  if (message) props.set("attributes[Message]", message.slice(0, 500));
  props.set("attributes[Design SVG]", designUrl);
  if (typeof nbElements === "number") props.set("attributes[Nb elements]", String(nbElements));

  const cartUrl = `https://${STORE_DOMAIN}/cart/${variantId}:1?${props.toString()}`;

  // Logger la demande aussi pour suivi (au cas où)
  const demande = {
    designId,
    date: new Date().toISOString(),
    prenom, email, tel, message,
    format, couleur, couleurNom, taille,
    nbElements,
    variantId,
    cartUrl,
  };
  await redisSet(`perso:cart:${designId}`, JSON.stringify(demande));

  // Email de notification à l'équipe Mood (await nécessaire sinon Vercel termine la fonction avant l'envoi)
  try {
    await envoyerEmailEquipe(demande, svg);
  } catch (e) {
    console.error("Email notification fail:", (e as Error).message);
    // Continue quand même — la commande reste valide même si l'email rate
  }

  return NextResponse.json({ ok: true, cartUrl, designId });
}

async function envoyerEmailEquipe(demande: Record<string, unknown>, svg: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const designUrl = `https://mood-tools.yourmood.net/api/design/${demande.designId}`;
  const dashboardUrl = `https://mood-tools.yourmood.net/perso-commandes`;
  const FORMAT_LABEL: Record<string, string> = {
    "addon": "Addon (7 mm)",
    "2-3": "Deux tiers (4.6 mm)",
    "medium": "Medium (2.3 mm)",
    "open-mood": "Open mood (10 mm)",
  };
  const formatLabel = FORMAT_LABEL[String(demande.format)] || demande.format;

  // Convertir le SVG en base64 pour l'attacher en pièce jointe ET l'embedder inline
  const svgBase64 = Buffer.from(svg).toString("base64");
  const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

  const html = `<div style="font-family:sans-serif;max-width:600px;color:#111">
    <h2 style="margin-bottom:4px">🛒 Nouvelle commande personnalisée</h2>
    <p style="color:#666;margin-top:0">Reçue le ${new Date().toLocaleString("fr-CH")}</p>
    <div style="background:#fff8e7;border:1px solid #c9a96e;border-radius:8px;padding:14px;margin:14px 0">
      <p style="margin:4px 0"><strong>Client :</strong> ${demande.prenom} — <a href="mailto:${demande.email}" style="color:#c9a96e">${demande.email}</a></p>
      ${demande.tel ? `<p style="margin:4px 0"><strong>Téléphone :</strong> ${demande.tel}</p>` : ""}
      <p style="margin:4px 0"><strong>Format :</strong> ${formatLabel}</p>
      <p style="margin:4px 0"><strong>Couleur :</strong> ${demande.couleurNom || demande.couleur}</p>
      <p style="margin:4px 0"><strong>Taille :</strong> ${demande.taille}</p>
      ${demande.message ? `<p style="margin:4px 0"><strong>Message :</strong> ${demande.message}</p>` : ""}
    </div>
    <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px;margin:14px 0;text-align:center">
      <p style="margin:0 0 10px;color:#666;font-size:13px">Aperçu du dessin</p>
      <img src="${svgDataUri}" alt="Design" style="max-width:100%;border:1px solid #eee;background:#fff" />
    </div>
    <p>
      <a href="${designUrl}" style="display:inline-block;background:#c9a96e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-right:8px">📥 Télécharger SVG</a>
      <a href="${dashboardUrl}" style="display:inline-block;background:#333;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">📋 Voir toutes les commandes</a>
    </p>
    <p style="color:#999;font-size:12px;margin-top:20px">Action requise côté équipe Mood :<br>
    1. Sortir la bague vierge alu correspondante du stock Katana (format + couleur + taille)<br>
    2. Décrémenter le stock<br>
    3. Graver avec Gravograph (SVG en pièce jointe ou via lien)<br>
    4. Préparer expédition</p>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Mood Personnalisation <katana@yourmood.net>",
      to: (process.env.PERSO_EMAIL_TO || "amila@yourmood.net,contact@yourmood.net").split(",").map((s) => s.trim()),
      reply_to: demande.email,
      subject: `🛒 Nouvelle commande perso — ${demande.prenom} — ${formatLabel} ${demande.couleurNom || demande.couleur}`,
      html,
      attachments: [{
        filename: `${demande.prenom}_${demande.format}_${demande.couleur}.svg`,
        content: svgBase64,
      }],
    }),
  });
  const respText = await r.text();
  if (!r.ok) {
    console.error("Resend email failed:", r.status, respText.slice(0, 500));
  } else {
    console.log("Resend email sent:", respText.slice(0, 200));
  }
}
