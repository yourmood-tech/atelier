import { redisGet, redisSet, PRICERULE_KEY } from "./store";

const SHOPIFY_TOKEN = process.env.SHOPIFY_API_TOKEN || process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN || process.env.SHOPIFY_STORE;
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;

const API = "2024-10";

// Réglages du bon
const BON_VALUE = "-10.0";          // 10.- de réduction
const BON_MIN_SUBTOTAL = "50.0";    // dès 50.- d'achat
const RULE_TITLE = "Pronostics Mondial 2026 — bon 10.-";

export function shopifyReady(): boolean { return !!(SHOPIFY_TOKEN && SHOPIFY_DOMAIN); }
export function klaviyoReady(): boolean { return !!KLAVIYO_API_KEY; }

async function shopify(pathname: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API}/${pathname}`, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN as string,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// Crée (une seule fois) la règle de prix réutilisable, et mémorise son id.
export async function ensurePriceRule(): Promise<number> {
  const existing = (await redisGet(PRICERULE_KEY)) as number | null;
  if (existing) return existing;

  const res = await shopify("price_rules.json", {
    method: "POST",
    body: JSON.stringify({
      price_rule: {
        title: RULE_TITLE,
        target_type: "line_item",
        target_selection: "all",
        allocation_method: "across",
        value_type: "fixed_amount",
        value: BON_VALUE,
        customer_selection: "all",
        once_per_customer: true,
        prerequisite_subtotal_range: { greater_than_or_equal_to: BON_MIN_SUBTOTAL },
        starts_at: new Date().toISOString(),
      },
    }),
  });
  if (!res.ok) throw new Error(`Shopify price_rule ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const id = j.price_rule.id as number;
  await redisSet(PRICERULE_KEY, id);
  return id;
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1 (lisibilité)
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MOND-${s}`;
}

// Crée un code unique (10.-, 1 utilisation) sous la règle de prix. Retourne le code.
export async function createDiscountCode(priceRuleId: number): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = randomCode();
    const res = await shopify(`price_rules/${priceRuleId}/discount_codes.json`, {
      method: "POST",
      body: JSON.stringify({ discount_code: { code, usage_limit: 1 } }),
    });
    if (res.ok) return code;
    const txt = await res.text();
    // collision de code → on retente avec un autre
    if (res.status === 422 && /taken|already/i.test(txt)) continue;
    throw new Error(`Shopify discount_code ${res.status}: ${txt.slice(0, 200)}`);
  }
  throw new Error("Impossible de générer un code unique après 4 essais");
}

// Supprime un code (utilisé pour les tests de vérification).
export async function deleteDiscountCode(priceRuleId: number, codeId: number): Promise<void> {
  await shopify(`price_rules/${priceRuleId}/discount_codes/${codeId}.json`, { method: "DELETE" });
}

// Événement Klaviyo → un Flow Klaviyo (configuré côté Mood) envoie le mail avec le code.
export async function sendBonEvent(params: {
  email: string; code: string; match: string; score: string; team: string;
}): Promise<void> {
  if (!klaviyoReady()) throw new Error("KLAVIYO_API_KEY manquante");
  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      "Content-Type": "application/json",
      revision: "2024-10-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          profile: { data: { type: "profile", attributes: { email: params.email } } },
          metric: { data: { type: "metric", attributes: { name: "BonPronosticMondial" } } },
          properties: {
            code: params.code,
            valeur: "10.-",
            minimum: "50.-",
            match: params.match,
            score: params.score,
            equipe: params.team,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Klaviyo ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
