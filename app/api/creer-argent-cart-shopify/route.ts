import { NextResponse } from "next/server";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Variant ID Shopify du produit générique "Bague personnalisée argent"
// Priorité : ENV SHOPIFY_ARGENT_VARIANT_ID > fallback Redis (rempli par /setup-perso-argent)
const ARGENT_VARIANT_ID_ENV = process.env.SHOPIFY_ARGENT_VARIANT_ID;

const FORMAT_LABELS: Record<string, string> = {
  "addon": "Addon (7 mm)",
  "2-3": "Deux tiers (4.6 mm)",
  "medium": "Medium (2.3 mm)",
};

const FORMAT_SKU: Record<string, string> = {
  "addon": "ADDON",
  "2-3": "23",
  "medium": "MED",
};

const FINITION_SKU: Record<string, string> = {
  "poli": "POLI",
  "brosse": "BROSSE",
  "neutre": "NEUTRE",
  "piquete": "PIQUETE",
};

const GRAVURE_LABELS: Record<string, string> = {
  "oxydee": "Oxydée (trait noir)",
  "neutre": "Neutre (trait clair)",
};

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const d = await r.json();
  return d.result || null;
}

type Pierre = {
  id: string; nom: string; taille: number; prix: number;
  x: number; y: number; sertissage: string;
};

type Demande = {
  prenom: string; email: string; tel?: string; message?: string;
  format: string; taille?: string;
  couleur?: string; couleurNom?: string;     // = finition (id + nom)
  gravure?: string;                          // 'oxydee' | 'neutre'
  svg?: string;                              // compat ancien champ (= svgComplet)
  svgGravure?: string; svgComplet?: string; svgPlan?: string;
  nbElements?: number;
  prix?: number; prixBase?: number;
  pierres?: Pierre[];
  pierresCount?: number; pierresTotal?: number;
};

export async function POST(req: Request) {
  let data: Partial<Demande>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const {
    prenom, email, tel, message,
    format, taille,
    couleur: finitionId, couleurNom: finitionNom,
    gravure,
    svgGravure, svgComplet, svgPlan, svg,
    nbElements, prix, prixBase, pierres = [], pierresCount, pierresTotal,
  } = data;

  if (!prenom || !email || !format || !finitionId || (!svgComplet && !svg)) {
    return NextResponse.json({ error: "Champs requis manquants (prénom, email, format, finition, design)" }, { status: 400 });
  }

  const fullSvgComplet = svgComplet || svg!;
  const fullSvgGravure = svgGravure || fullSvgComplet;
  const fullSvgPlan = svgPlan || fullSvgComplet;

  for (const s of [fullSvgComplet, fullSvgGravure, fullSvgPlan]) {
    if (s.length > 300_000) {
      return NextResponse.json({ error: "Design SVG trop volumineux" }, { status: 413 });
    }
  }

  // Récupérer le variant ID : ENV en priorité, sinon fallback Redis (rempli par /setup-perso-argent)
  const variantIdFromRedis = ARGENT_VARIANT_ID_ENV ? null : await redisGet("perso:argent:variant_id");
  const ARGENT_VARIANT_ID = ARGENT_VARIANT_ID_ENV || variantIdFromRedis;
  if (!ARGENT_VARIANT_ID) {
    return NextResponse.json({
      error: "Produit Shopify argent non configuré. Va sur /setup-perso-argent pour le créer en 1 clic.",
    }, { status: 503 });
  }

  // Stocker les 3 SVG dans Redis avec un ID unique → URLs publiques
  const designId = `argent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await Promise.all([
    redisSet(`perso:argent:design:${designId}:complet`, fullSvgComplet),
    redisSet(`perso:argent:design:${designId}:gravure`, fullSvgGravure),
    redisSet(`perso:argent:design:${designId}:plan`, fullSvgPlan),
  ]);
  const base = `https://mood-tools.yourmood.net/api/design-argent/${designId}`;
  const urlComplet = `${base}/complet`;
  const urlGravure = `${base}/gravure`;
  const urlPlan = `${base}/plan`;

  // SKU Katana argent : MED-PERSO-ARGENT-POLI-54 (à valider avec Sandrine/Philippe)
  const skuComplet = `${FORMAT_SKU[format] || format.toUpperCase()}-PERSO-ARGENT-${FINITION_SKU[finitionId] || finitionId.toUpperCase()}-${taille || "??"}`;
  const formatLabel = FORMAT_LABELS[format] || format;
  const gravureLabel = GRAVURE_LABELS[gravure || "oxydee"] || (gravure || "Oxydée");
  const prixFinal = typeof prix === "number" ? prix : 179;

  // Récap des pierres en texte lisible pour Shopify properties
  type Groupe = { nom: string; taille: number; sertissage: string; count: number; prix: number };
  const groupes: Record<string, Groupe> = {};
  for (const p of pierres) {
    const key = `${p.id}|${p.sertissage}`;
    if (!groupes[key]) groupes[key] = { nom: p.nom, taille: p.taille, sertissage: p.sertissage, count: 0, prix: p.prix };
    groupes[key].count++;
  }
  const pierresRecap = Object.values(groupes)
    .map(g => `${g.count}× ${g.nom} ${g.taille}mm (sertissage ${g.sertissage})`)
    .join(" · ") || "—";

  // Créer le Draft Order Shopify
  let invoiceUrl = "";
  try {
    const draftBody = {
      draft_order: {
        line_items: [{
          variant_id: parseInt(ARGENT_VARIANT_ID, 10),
          quantity: 1,
          price: prixFinal.toFixed(2),
          properties: [
            { name: "Matière", value: "Argent 925" },
            { name: "Format", value: formatLabel },
            { name: "Finition", value: finitionNom || finitionId },
            { name: "Taille", value: taille || "" },
            { name: "Type de gravure", value: gravureLabel },
            { name: "SKU Katana", value: skuComplet },
            { name: "Prix base argent", value: `${prixBase || 0} CHF` },
            { name: "Pierres", value: pierresRecap },
            { name: "Nb pierres", value: String(pierresCount || 0) },
            { name: "Total pierres", value: `${pierresTotal || 0} CHF` },
            { name: "SVG Gravure", value: urlGravure },
            { name: "SVG Complet", value: urlComplet },
            { name: "Plan sertissage", value: urlPlan },
            ...(nbElements != null ? [{ name: "Nb éléments dessin", value: String(nbElements) }] : []),
            ...(message ? [{ name: "Message client", value: message.slice(0, 500) }] : []),
            { name: "Prénom", value: prenom },
            { name: "Téléphone", value: tel || "" },
          ],
        }],
        customer: { email },
        email,
        note: `Bague argent ${formatLabel} ${finitionNom || finitionId} taille ${taille}. Gravure ${gravureLabel}. Pierres : ${pierresRecap}. SKU Katana : ${skuComplet}. Gravure : ${urlGravure}. Plan : ${urlPlan}.`,
        use_customer_default_address: false,
      },
    };
    const draftR = await fetch(`https://${STORE}/admin/api/${API_VERSION}/draft_orders.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(draftBody),
    });
    const draftData = await draftR.json();
    if (!draftR.ok) {
      console.error("Draft order argent failed:", draftR.status, JSON.stringify(draftData).slice(0, 500));
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

  // Logger la demande
  const demande = {
    designId, date: new Date().toISOString(),
    prenom, email, tel, message,
    format, finition: finitionId, finitionNom, taille, gravure,
    pierres, pierresCount, pierresTotal,
    nbElements, prix: prixFinal, prixBase,
    skuComplet, variantId: ARGENT_VARIANT_ID, cartUrl,
  };
  await redisSet(`perso:argent:cart:${designId}`, JSON.stringify(demande));

  // Email équipe avec les 3 SVG
  try {
    await envoyerEmailEquipe(demande, fullSvgGravure, fullSvgComplet, fullSvgPlan, pierresRecap);
  } catch (e) {
    console.error("Email notification fail:", (e as Error).message);
  }

  return NextResponse.json({ ok: true, cartUrl, designId });
}

async function envoyerEmailEquipe(
  demande: Record<string, unknown>,
  svgGravure: string, svgComplet: string, svgPlan: string,
  pierresRecap: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const designId = demande.designId as string;
  const urlBase = `https://mood-tools.yourmood.net/api/design-argent/${designId}`;
  const dashboardUrl = `https://mood-tools.yourmood.net/perso-commandes`;

  const formatLabel = FORMAT_LABELS[String(demande.format)] || demande.format;
  const svgCompletB64 = Buffer.from(svgComplet).toString("base64");
  const svgCompletDataUri = `data:image/svg+xml;base64,${svgCompletB64}`;

  const html = `<div style="font-family:sans-serif;max-width:680px;color:#111">
    <h2 style="margin-bottom:4px">🛒 Nouvelle commande bague argent personnalisée</h2>
    <p style="color:#666;margin-top:0">Reçue le ${new Date().toLocaleString("fr-CH")}</p>
    <div style="background:#fff8e7;border:1px solid #c9a96e;border-radius:8px;padding:14px;margin:14px 0">
      <p style="margin:4px 0"><strong>Client :</strong> ${demande.prenom} — <a href="mailto:${demande.email}" style="color:#c9a96e">${demande.email}</a></p>
      ${demande.tel ? `<p style="margin:4px 0"><strong>Téléphone :</strong> ${demande.tel}</p>` : ""}
      <p style="margin:4px 0"><strong>Format :</strong> ${formatLabel}</p>
      <p style="margin:4px 0"><strong>Finition :</strong> ${demande.finitionNom || demande.finition}</p>
      <p style="margin:4px 0"><strong>Taille :</strong> ${demande.taille}</p>
      <p style="margin:4px 0"><strong>Type de gravure :</strong> ${GRAVURE_LABELS[String(demande.gravure || "oxydee")]}</p>
      <p style="margin:4px 0"><strong>Pierres :</strong> ${pierresRecap}</p>
      <p style="margin:4px 0"><strong>SKU Katana :</strong> ${demande.skuComplet}</p>
      <p style="margin:4px 0"><strong>Prix total :</strong> ${demande.prix} CHF</p>
      ${demande.message ? `<p style="margin:4px 0"><strong>Message :</strong> ${demande.message}</p>` : ""}
    </div>
    <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px;margin:14px 0;text-align:center">
      <p style="margin:0 0 10px;color:#666;font-size:13px">Aperçu du dessin complet (avec pierres)</p>
      <img src="${svgCompletDataUri}" alt="Design" style="max-width:100%;border:1px solid #eee;background:#fff" />
    </div>
    <p>
      <a href="${urlBase}/gravure" style="display:inline-block;background:#c9a96e;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;margin:0 4px 4px 0">📥 SVG Gravure (Gravograph)</a>
      <a href="${urlBase}/complet" style="display:inline-block;background:#888;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;margin:0 4px 4px 0">📥 SVG Complet</a>
      <a href="${urlBase}/plan" style="display:inline-block;background:#5a6b5a;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;margin:0 4px 4px 0">📋 Plan sertissage</a>
      <a href="${dashboardUrl}" style="display:inline-block;background:#333;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;margin:0 4px 4px 0">📊 Dashboard</a>
    </p>
    <p style="color:#999;font-size:12px;margin-top:20px">Workflow atelier :<br>
    1. Sortir la bague argent vierge du stock Katana (format + finition + taille)<br>
    2. Décrémenter le stock argent + pierres dans Katana<br>
    3. Graver avec Gravograph mécanique (SVG Gravure — trait dessins uniquement, sans pierres)<br>
    4. Sertir les pierres selon le plan (sertissage indiqué par pierre)<br>
    5. Finition (oxydation si gravure oxydée)<br>
    6. Préparer expédition</p>
  </div>`;

  const attachments = [
    { filename: `${demande.prenom}_argent_gravure.svg`, content: Buffer.from(svgGravure).toString("base64") },
    { filename: `${demande.prenom}_argent_complet.svg`, content: Buffer.from(svgComplet).toString("base64") },
    { filename: `${demande.prenom}_argent_plan-sertissage.svg`, content: Buffer.from(svgPlan).toString("base64") },
  ];

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Mood Personnalisation Argent <katana@yourmood.net>",
      to: (process.env.PERSO_EMAIL_TO || "amila@yourmood.net,contact@yourmood.net").split(",").map((s) => s.trim()),
      reply_to: demande.email,
      subject: `🛒 Bague argent — ${demande.prenom} — ${formatLabel} ${demande.finitionNom || demande.finition}`,
      html,
      attachments,
    }),
  });
  const respText = await r.text();
  if (!r.ok) console.error("Resend email argent failed:", r.status, respText.slice(0, 500));
}
