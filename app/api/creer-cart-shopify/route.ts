import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const FORMAT_LABELS: Record<string, string> = {
  "addon": "Addon (7 mm)",
  "2-3": "Deux tiers (4.6 mm)",
  "medium": "Medium (2.3 mm)",
  "open-mood": "Open mood (10 mm)",
};

const FORMAT_SKU: Record<string, string> = {
  "addon": "ADDON",
  "2-3": "23",
  "medium": "MED",
  "open-mood": "OPEN",
};

const COULEUR_SKU: Record<string, string> = {
  "noir": "NOIR",
  "rouge": "ROUGE",
  "bleu-marine": "MARINE",
  "lilas-cashmere": "LILAS",
  "belipastel": "BELI",
  "rose-pastel": "ROSEP",
  "noisette": "NOISETTE",
  "peche": "PECHE",
  "abricot": "ABRICOT",
  "jaune-pastel": "JAUNEP",
  "vert-pastel": "VERTP",
  "bleu-pastel": "BLEUP",
};

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
  prix?: number;     // prix calculé par le configurateur (override Shopify)
  niveau?: string;   // niveau de complexité (simple/moyen/complexe)
};

export async function POST(req: Request) {
  let data: Partial<Demande>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { prenom, email, format, couleur, couleurNom, taille, svg, tel, message, nbElements, prix, niveau } = data;
  if (!prenom || !email || !format || !couleur || !svg) {
    return NextResponse.json({ error: "Champs requis manquants (prénom, email, format, couleur, design)" }, { status: 400 });
  }
  if (svg.length > 200_000) {
    return NextResponse.json({ error: "Design SVG trop volumineux" }, { status: 413 });
  }

  // Récupérer la config produit depuis Redis
  const configRaw = await redisGet("perso:shopify:variants");
  if (!configRaw) {
    return NextResponse.json({ error: "Produit Shopify non créé. L'équipe Mood doit aller sur /setup-perso." }, { status: 503 });
  }
  type Config = { productId: number; handle: string; variants: Record<string, number> };
  const config: Config = JSON.parse(configRaw);
  const variantId = taille ? config.variants?.[taille] : undefined;
  if (!variantId) {
    return NextResponse.json({ error: `Variant introuvable pour taille=${taille}. Recréer les produits sur /setup-perso.` }, { status: 400 });
  }

  // Stocker le SVG dans Redis avec un ID unique → URL publique
  const designId = `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await redisSet(`perso:design:${designId}`, svg);
  const designUrl = `https://mood-tools.yourmood.net/api/design/${designId}`;

  // SKU complet pour Katana : MED-PERSO-ROUGE-ALU-54
  const skuComplet = `${FORMAT_SKU[format] || format.toUpperCase()}-PERSO-${COULEUR_SKU[couleur] || couleur.toUpperCase()}-ALU-${taille || "??"}`;
  const formatLabel = FORMAT_LABELS[format] || format;
  const prixFinal = typeof prix === "number" ? prix : 85; // fallback 85 si pas calculé

  // Créer un Draft Order Shopify avec le prix calculé + toutes les infos en line item properties
  let invoiceUrl = "";
  try {
    const draftBody = {
      draft_order: {
        line_items: [{
          variant_id: variantId,
          quantity: 1,
          price: prixFinal.toFixed(2),
          properties: [
            { name: "Format", value: formatLabel },
            { name: "Couleur", value: couleurNom || couleur },
            { name: "Taille", value: taille || "" },
            { name: "SKU Katana", value: skuComplet },
            { name: "Design SVG", value: designUrl },
            ...(niveau ? [{ name: "Complexité", value: niveau }] : []),
            ...(nbElements != null ? [{ name: "Nb éléments", value: String(nbElements) }] : []),
            ...(message ? [{ name: "Message client", value: message.slice(0, 500) }] : []),
            { name: "Prénom", value: prenom },
            { name: "Téléphone", value: tel || "" },
          ],
        }],
        customer: { email },
        email,
        note: `Bague personnalisée — ${formatLabel} ${couleurNom || couleur} taille ${taille}. SKU Katana : ${skuComplet}. Design : ${designUrl}`,
        use_customer_default_address: false,
      },
    };
    const draftR = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftBody),
    });
    const draftData = await draftR.json();
    if (!draftR.ok) {
      console.error("Draft order failed:", draftR.status, JSON.stringify(draftData).slice(0, 500));
      return NextResponse.json({ error: `Shopify Draft Order ${draftR.status}: ${JSON.stringify(draftData).slice(0, 200)}` }, { status: 500 });
    }
    invoiceUrl = draftData.draft_order?.invoice_url;
    if (!invoiceUrl) {
      return NextResponse.json({ error: "Pas d'invoice_url retourné par Shopify Draft Order" }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: "Création Draft Order échouée: " + (e as Error).message }, { status: 500 });
  }

  const cartUrl = invoiceUrl;

  // Logger la demande pour suivi
  const demande = {
    designId,
    date: new Date().toISOString(),
    prenom, email, tel, message,
    format, couleur, couleurNom, taille,
    nbElements, prix: prixFinal, niveau,
    skuComplet,
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
