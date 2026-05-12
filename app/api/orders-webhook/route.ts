import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_API_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

const KATANA_BASE = process.env.KATANA_BASE_URL;
const KATANA_KEY = process.env.KATANA_API_KEY;
const KATANA_LOCATION_ID = Number(process.env.KATANA_DEFAULT_LOCATION_ID || 0);

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

type NoteAttribute = { name: string; value: string };
type LineItemProperty = { name: string; value: string };
type LineItem = {
  id: number;
  sku: string | null;
  title: string;
  quantity: number;
  properties?: LineItemProperty[];
};

type ShopifyOrder = {
  id: number;
  name: string;
  email?: string;
  note: string | null;
  tags: string;
  note_attributes: NoteAttribute[];
  line_items?: LineItem[];
};

// ============ Mapping SKU PERSO → SKU VIERGE Katana ============

type FormatKey = "ADDON" | "23" | "MED" | "OPEN";
const FORMAT_CONFIG: Record<FormatKey, { katanaPrefix: string; tailleAvantCouleur: boolean }> = {
  ADDON: { katanaPrefix: "MTRL-ALU",     tailleAvantCouleur: true },
  "23":  { katanaPrefix: "MTRL-23ALU",   tailleAvantCouleur: true },
  MED:   { katanaPrefix: "MTRL-MEDALU",  tailleAvantCouleur: true },
  OPEN:  { katanaPrefix: "MTRL-OPENALU", tailleAvantCouleur: false },
};

const COULEUR_KATANA: Record<FormatKey, Record<string, string>> = {
  ADDON: {
    NOIR: "NOIR", ROUGE: "ROUGE", MARINE: "MARINE",
    LILAS: "LILAS", BELI: "BELI", ROSEP: "ROSEP",
    NOISETTE: "NOISETTE", PECHE: "PECHE", ABRICOT: "ABRICOT",
    JAUNEP: "JAUNEPASTEL", VERTP: "VP", BLEUP: "BLEUPASTEL",
  },
  "23": {
    NOIR: "NOIR", ROUGE: "ROUGE", MARINE: "MARINE",
    LILAS: "LIL", BELI: "BELIP", ROSEP: "ROSEP",
    NOISETTE: "NOISETTE", PECHE: "PECHE", ABRICOT: "ABRICOT",
    JAUNEP: "JAUNEPASTEL", VERTP: "VERTPASTEL", BLEUP: "BP",
  },
  MED: {
    NOIR: "NOIR", ROUGE: "ROUGE", MARINE: "MARINE",
    LILAS: "LILACASHMERE", BELI: "BELIP", ROSEP: "ROSEP",
    NOISETTE: "NOISETTE", PECHE: "PECHE", ABRICOT: "ABRICOT",
    JAUNEP: "JAUNEP", VERTP: "VERTPASTEL", BLEUP: "BLEUPASTEL",
  },
  OPEN: {
    NOIR: "NOIR", ROUGE: "ROUGE", MARINE: "MARINE",
    LILAS: "LILASCASHMERE", BELI: "BELIPASTEL", ROSEP: "ROSEPASTEL",
    NOISETTE: "NOISETTE", PECHE: "PECHE", ABRICOT: "ABRICOT",
    JAUNEP: "JAUNP", VERTP: "VERTP", BLEUP: "BLEUP",
  },
};

// Convention SKU argent Katana (à confirmer avec Amila/Sandrine si différente)
const ARGENT_PREFIX: Record<string, string> = {
  ADDON: "MTRL-ADDONARG",
  "23":  "MTRL-23ARG",
  MED:   "MTRL-MEDARG",
};

function persoSkuToKatanaSku(persoSku: string): string | null {
  // Cas alu : {FORMAT}-PERSO-{COULEUR}-ALU-{TAILLE}
  const aluMatch = persoSku.match(/^(MED|23|ADDON|OPEN)-PERSO-([A-Z]+)-ALU-(\d+)$/);
  if (aluMatch) {
    const [, formatSku, couleurSku, taille] = aluMatch;
    const config = FORMAT_CONFIG[formatSku as FormatKey];
    const couleurKatana = COULEUR_KATANA[formatSku as FormatKey]?.[couleurSku];
    if (!config || !couleurKatana) return null;
    return config.tailleAvantCouleur
      ? `${config.katanaPrefix}-${taille}-${couleurKatana}`
      : `${config.katanaPrefix}-${couleurKatana}-${taille}`;
  }
  // Cas argent : {FORMAT}-PERSO-ARGENT-{FINITION}-{TAILLE} → MTRL-{FORMAT}ARG-{TAILLE}-{FINITION}
  const argentMatch = persoSku.match(/^(MED|23|ADDON)-PERSO-ARGENT-([A-Z]+)-(\d+)$/);
  if (argentMatch) {
    const [, formatSku, finitionSku, taille] = argentMatch;
    const prefix = ARGENT_PREFIX[formatSku];
    if (!prefix) return null;
    return `${prefix}-${taille}-${finitionSku}`;
  }
  return null;
}

// ============ Katana API ============

async function katanaFetch(path: string, init?: RequestInit): Promise<unknown> {
  if (!KATANA_BASE || !KATANA_KEY) throw new Error("Katana env non configuré");
  const r = await fetch(`${KATANA_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${KATANA_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Katana ${r.status} on ${path}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function getKatanaVariantBySku(sku: string): Promise<{ id: number } | null> {
  const params = new URLSearchParams({ sku, limit: "10" });
  const data = (await katanaFetch(`/v1/variants?${params}`)) as { data?: Array<{ id: number; sku?: string | null }> };
  const variants = data.data || [];
  const exact = variants.find((v) => v.sku === sku);
  return exact ? { id: exact.id } : null;
}

async function decrementKatanaStock(variantId: number, quantity: number): Promise<unknown> {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const num = `PERSO-${ts}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const payload = {
    stock_adjustment_number: num,
    location_id: KATANA_LOCATION_ID,
    stock_adjustment_rows: [{ variant_id: variantId, quantity: -quantity }],
  };
  return katanaFetch("/v1/stock_adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ============ Redis ============

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

async function verifyHmac(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // Skip verification if secret not configured
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  return digest === hmacHeader;
}

async function shopifyPatch(orderId: number, body: unknown) {
  const r = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}/orders/${orderId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Shopify PATCH order ${orderId}: ${r.status} — ${text.slice(0, 200)}`);
  }
}

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Corps illisible" }, { status: 400 });
  }

  if (!(await verifyHmac(req, rawBody))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const designAttr = order.note_attributes?.find(
    (a) => a.name === "Design SVG"
  );

  // Not a perso order — ignore
  if (!designAttr) {
    return NextResponse.json({ ok: true, skipped: "no Design SVG attribute" });
  }

  const updates: { note?: string; tags?: string } = {};

  // Append SVG link to existing note (or create note)
  const svgLine = `🎨 Design personnalisé : ${designAttr.value}`;
  updates.note = order.note ? `${order.note}\n${svgLine}` : svgLine;

  // Add autoperso tag without removing existing tags
  const existingTags = order.tags
    ? order.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  if (!existingTags.includes("autoperso")) {
    updates.tags = [...existingTags, "autoperso"].join(", ");
  }

  try {
    await shopifyPatch(order.id, { order: { id: order.id, ...updates } });
    console.log(`orders-webhook: order ${order.name} — tag autoperso + note SVG ajoutés`);
  } catch (e) {
    console.error("orders-webhook patch error:", (e as Error).message);
    // On continue malgré l'erreur tag/note, pour quand même tenter le stock Katana
  }

  // Décrémentation automatique du stock Katana pour chaque ligne de bague perso
  const katanaResultats: Array<{ persoSku: string; katanaSku: string | null; ok: boolean; erreur?: string }> = [];
  if (KATANA_BASE && KATANA_KEY) {
    for (const item of order.line_items || []) {
      // Accepte les 2 SKU génériques perso : alu (BAGUE-PERSO) et argent (BAGUE-PERSO-ARGENT)
      if (item.sku !== "BAGUE-PERSO" && item.sku !== "BAGUE-PERSO-ARGENT") continue;
      const skuProp = item.properties?.find((p) => p.name === "SKU Katana")?.value;
      if (!skuProp) {
        katanaResultats.push({ persoSku: "?", katanaSku: null, ok: false, erreur: "Property SKU Katana manquante" });
        continue;
      }
      const katanaSku = persoSkuToKatanaSku(skuProp);
      if (!katanaSku) {
        katanaResultats.push({ persoSku: skuProp, katanaSku: null, ok: false, erreur: "Mapping format/couleur introuvable" });
        continue;
      }
      try {
        const v = await getKatanaVariantBySku(katanaSku);
        if (!v) {
          katanaResultats.push({ persoSku: skuProp, katanaSku, ok: false, erreur: "SKU vierge inexistant dans Katana" });
          continue;
        }
        await decrementKatanaStock(v.id, item.quantity);
        console.log(`orders-webhook: -${item.quantity} ${katanaSku} (variant ${v.id})`);
        katanaResultats.push({ persoSku: skuProp, katanaSku, ok: true });
      } catch (e: unknown) {
        console.error(`orders-webhook Katana error pour ${katanaSku}:`, (e as Error).message);
        katanaResultats.push({ persoSku: skuProp, katanaSku, ok: false, erreur: (e as Error).message });
      }
    }
  }

  // Audit en Redis (visible dans /perso-commandes)
  if (katanaResultats.length > 0) {
    const auditEntry = {
      orderId: order.id,
      orderName: order.name,
      email: order.email,
      date: new Date().toISOString(),
      katanaResultats,
    };
    await redisSet(`perso:webhook:${order.id}`, JSON.stringify(auditEntry));
  }

  return NextResponse.json({ ok: true, katanaResultats });
}
