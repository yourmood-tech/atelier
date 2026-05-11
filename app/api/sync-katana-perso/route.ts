import { NextResponse } from "next/server";
import { auth } from "@/auth";

const KATANA_BASE = process.env.KATANA_BASE_URL;
const KATANA_KEY = process.env.KATANA_API_KEY;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// ============ Référentiels ============

const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

const COULEURS = [
  { id: "noir",           sku: "NOIR"     },
  { id: "rouge",          sku: "ROUGE"    },
  { id: "bleu-marine",    sku: "MARINE"   },
  { id: "lilas-cashmere", sku: "LILAS"    },
  { id: "belipastel",     sku: "BELI"     },
  { id: "rose-pastel",    sku: "ROSEP"    },
  { id: "noisette",       sku: "NOISETTE" },
  { id: "peche",          sku: "PECHE"    },
  { id: "abricot",        sku: "ABRICOT"  },
  { id: "jaune-pastel",   sku: "JAUNEP"   },
  { id: "vert-pastel",    sku: "VERTP"    },
  { id: "bleu-pastel",    sku: "BLEUP"    },
];

const FORMATS = [
  { id: "addon",     nom: "Addon",      sku: "ADDON" },
  { id: "2-3",       nom: "Deux tiers", sku: "23"    },
  { id: "medium",    nom: "Medium",     sku: "MED"   },
  { id: "open-mood", nom: "Open mood",  sku: "OPEN"  },
];

type FormatSku = "ADDON" | "23" | "MED" | "OPEN";

const FORMAT_MTRL: Record<FormatSku, { prefix: string; tailleFirst: boolean }> = {
  ADDON: { prefix: "MTRL-ALU",     tailleFirst: true  },
  "23":  { prefix: "MTRL-23ALU",   tailleFirst: true  },
  MED:   { prefix: "MTRL-MEDALU",  tailleFirst: true  },
  OPEN:  { prefix: "MTRL-OPENALU", tailleFirst: false },
};

const COULEUR_KATANA: Record<FormatSku, Record<string, string>> = {
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

function toMtrlSku(formatSku: FormatSku, taille: number, couleurSku: string): string | null {
  const cfg = FORMAT_MTRL[formatSku];
  const couleurKatana = COULEUR_KATANA[formatSku]?.[couleurSku];
  if (!cfg || !couleurKatana) return null;
  return cfg.tailleFirst
    ? `${cfg.prefix}-${taille}-${couleurKatana}`
    : `${cfg.prefix}-${couleurKatana}-${taille}`;
}

// ============ Katana helpers ============

async function katanaFetch(path: string, init?: RequestInit, retries = 3): Promise<unknown> {
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
  if (r.status === 429 && retries > 0) {
    const wait = Number(r.headers.get("Retry-After") ?? 1) * 1000;
    await new Promise((res) => setTimeout(res, wait));
    return katanaFetch(path, init, retries - 1);
  }
  const text = await r.text();
  if (!r.ok) throw new Error(`Katana ${r.status} on ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function findKatanaProductByName(name: string): Promise<number | null> {
  const data = (await katanaFetch(
    `/v1/products?search=${encodeURIComponent(name)}&limit=20`
  )) as { data?: { id: number; name: string }[] };
  return (data.data ?? []).find((p) => p.name === name)?.id ?? null;
}

async function katanaVariantsBySku(sku: string): Promise<{ id: number; product_id: number } | null> {
  const data = (await katanaFetch(
    `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`
  )) as { data?: { id: number; product_id: number; sku: string }[] };
  return data.data?.[0] ?? null;
}

async function katanaVariantsByProductId(productId: number): Promise<{ id: number; sku: string | null }[]> {
  const data = (await katanaFetch(
    `/v1/variants?product_id=${productId}&limit=500`
  )) as { data?: { id: number; sku: string | null }[] };
  return data.data ?? [];
}

// ============ Redis ============

async function redisGet(key: string): Promise<string | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  return ((await r.json()) as { result?: string | null }).result ?? null;
}

async function redisSet(key: string, value: string) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
}

// ============ Types ============

type KatanaConfig = Record<string, { katanaProductId: number; variantsTotal: number; recipesCreated: number; recipesSkipped: number }>;

// ============ Endpoint ============

// POST — Crée 4 produits Katana + 144 variants chacun + 576 recettes (idempotent)
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  if (!KATANA_BASE || !KATANA_KEY) return NextResponse.json({ error: "Katana env non configuré" }, { status: 503 });

  const shopifyRaw = await redisGet("perso:shopify:variants");
  if (!shopifyRaw) {
    return NextResponse.json(
      { error: "Produits Shopify non créés. Aller sur /setup-perso d'abord." },
      { status: 503 }
    );
  }

  const katanaResultats: KatanaConfig = {};
  const errors: string[] = [];

  for (const fmt of FORMATS) {
    const formatSku = fmt.sku as FormatSku;
    const productName = `Bague personnalisée — ${fmt.nom}`;

    try {
      // 1. Find or create Katana product
      let katanaProductId = await findKatanaProductByName(productName);

      if (!katanaProductId) {
        const allSkus = TAILLES.flatMap((t) => COULEURS.map((c) => `PERSO-${fmt.sku}-${t}-${c.sku}`));
        const created = (await katanaFetch("/v1/products", {
          method: "POST",
          body: JSON.stringify({
            name: productName,
            is_sellable: true,
            is_producible: true,
            variants: allSkus.map((sku) => ({ sku })),
          }),
        })) as { id: number };
        katanaProductId = created.id;
      }

      // 2. Get existing finished-good variants
      const fgVariants = await katanaVariantsByProductId(katanaProductId);
      const fgBySku = new Map<string, number>(
        fgVariants.filter((v) => v.sku).map((v) => [v.sku!, v.id])
      );

      // 3. Ensure all 144 variants exist (create any missing ones)
      const allCombos = TAILLES.flatMap((t) =>
        COULEURS.map((c) => ({ persoSku: `PERSO-${fmt.sku}-${t}-${c.sku}`, taille: t, couleurSku: c.sku }))
      );
      const missing = allCombos.filter((c) => !fgBySku.has(c.persoSku));
      for (const m of missing) {
        try {
          const v = (await katanaFetch("/v1/variants", {
            method: "POST",
            body: JSON.stringify({ product_id: katanaProductId, sku: m.persoSku }),
          })) as { id: number };
          fgBySku.set(m.persoSku, v.id);
        } catch (e) {
          errors.push(`Variant ${m.persoSku}: ${(e as Error).message}`);
        }
      }

      // 4. Load material variants for this format (2 API calls via product_id lookup)
      const mtrlBySku = new Map<string, number>();
      const firstMtrlSku = toMtrlSku(formatSku, 56, "ROUGE");
      if (firstMtrlSku) {
        const anchor = await katanaVariantsBySku(firstMtrlSku);
        if (anchor) {
          const mtrlVariants = await katanaVariantsByProductId(anchor.product_id);
          for (const v of mtrlVariants) {
            if (v.sku) mtrlBySku.set(v.sku, v.id);
          }
        }
      }

      // 5. Build recipe rows — fallback to individual SKU lookup for unresolved materials
      const recipeRows: { productVariantId: number; ingredientVariantId: number }[] = [];
      for (const combo of allCombos) {
        const fgId = fgBySku.get(combo.persoSku);
        if (!fgId) continue;

        const mtrlSku = toMtrlSku(formatSku, combo.taille, combo.couleurSku);
        if (!mtrlSku) {
          errors.push(`Mapping couleur manquant: ${combo.persoSku}`);
          continue;
        }

        let mtrlId = mtrlBySku.get(mtrlSku);
        if (!mtrlId) {
          try {
            const v = await katanaVariantsBySku(mtrlSku);
            if (v) {
              mtrlBySku.set(mtrlSku, v.id);
              mtrlId = v.id;
            } else {
              errors.push(`Matière introuvable dans Katana: ${mtrlSku}`);
              continue;
            }
          } catch (e) {
            errors.push(`Lookup ${mtrlSku}: ${(e as Error).message}`);
            continue;
          }
        }

        recipeRows.push({ productVariantId: fgId, ingredientVariantId: mtrlId });
      }

      // 6. Fetch existing recipes and create only new ones
      const existingRecipesData = (await katanaFetch(
        `/v1/recipes?product_id=${katanaProductId}&limit=500`
      )) as { data?: { product_variant_id: number; ingredient_variant_id: number }[] };

      const existingKeys = new Set(
        (existingRecipesData.data ?? []).map((r) => `${r.product_variant_id}-${r.ingredient_variant_id}`)
      );

      const newRecipes = recipeRows.filter(
        (r) => !existingKeys.has(`${r.productVariantId}-${r.ingredientVariantId}`)
      );
      const skipped = recipeRows.length - newRecipes.length;

      let recipesCreated = 0;
      const BATCH = 50;
      for (let i = 0; i < newRecipes.length; i += BATCH) {
        const batch = newRecipes.slice(i, i + BATCH);
        try {
          await katanaFetch("/v1/recipes", {
            method: "POST",
            body: JSON.stringify({
              rows: batch.map((r) => ({
                product_variant_id: r.productVariantId,
                ingredient_variant_id: r.ingredientVariantId,
                quantity: 1,
              })),
            }),
          });
          recipesCreated += batch.length;
        } catch (e) {
          errors.push(`Recettes batch ${fmt.id}[${i}]: ${(e as Error).message}`);
        }
      }

      katanaResultats[fmt.id] = {
        katanaProductId,
        variantsTotal: fgBySku.size,
        recipesCreated,
        recipesSkipped: skipped,
      };
    } catch (e: unknown) {
      errors.push(`Format ${fmt.id}: ${(e as Error).message}`);
    }
  }

  await redisSet("perso:katana:config", JSON.stringify(katanaResultats));
  return NextResponse.json({ ok: true, katanaResultats, errors });
}

// GET — État de la sync Katana depuis Redis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  const raw = await redisGet("perso:katana:config");
  let config: KatanaConfig | null = null;
  if (raw) {
    try { config = JSON.parse(raw) as KatanaConfig; } catch { config = null; }
  }
  return NextResponse.json({ config });
}

// DELETE — Reset la config Katana dans Redis
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  await redisSet("perso:katana:config", "");
  return NextResponse.json({ ok: true });
}
