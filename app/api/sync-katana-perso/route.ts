import { NextResponse } from "next/server";
import { auth } from "@/auth";

const KATANA_BASE = process.env.KATANA_BASE_URL;
const KATANA_KEY = process.env.KATANA_API_KEY;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// ============ Référentiels ============

const TAILLES = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72];

const COULEURS = [
  { id: "noir",           nom: "Noir",           sku: "NOIR"     },
  { id: "rouge",          nom: "Rouge",          sku: "ROUGE"    },
  { id: "bleu-marine",    nom: "Bleu marine",    sku: "MARINE"   },
  { id: "lilas-cashmere", nom: "Lilas cashmere", sku: "LILAS"    },
  { id: "belipastel",     nom: "Belipastel",     sku: "BELI"     },
  { id: "rose-pastel",    nom: "Rose pastel",    sku: "ROSEP"    },
  { id: "noisette",       nom: "Noisette",       sku: "NOISETTE" },
  { id: "peche",          nom: "Pêche",          sku: "PECHE"    },
  { id: "abricot",        nom: "Abricot",        sku: "ABRICOT"  },
  { id: "jaune-pastel",   nom: "Jaune pastel",   sku: "JAUNEP"   },
  { id: "vert-pastel",    nom: "Vert pastel",    sku: "VERTP"    },
  { id: "bleu-pastel",    nom: "Bleu pastel",    sku: "BLEUP"    },
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

// Parse taille + couleurNom depuis SKU = PERSO-{fmt}-{taille}-{couleurSku}
function parsePersoSku(sku: string): { taille: string; couleurNom: string } | null {
  const m = sku.match(/^PERSO-[A-Z0-9]+-(\d+)-([A-Z]+)$/);
  if (!m) return null;
  const couleur = COULEURS.find((c) => c.sku === m[2]);
  if (!couleur) return null;
  return { taille: m[1], couleurNom: couleur.nom };
}

const CONFIG_ATTRS_TAILLE_COULEUR = (taille: number | string, couleurNom: string) => [
  { config_name: "Taille", config_value: String(taille) },
  { config_name: "Couleur", config_value: couleurNom },
];

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
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Katana réponse non-JSON on ${path}: ${text.slice(0, 200)}`);
  }
}

type KatanaVariantRaw = {
  id: number;
  sku: string | null;
  config_attributes?: { config_name: string; config_value: string }[];
};

async function findKatanaProductByName(name: string): Promise<number | null> {
  const data = (await katanaFetch(
    `/v1/products?search=${encodeURIComponent(name)}&limit=20`
  )) as { data?: { id: number; name: string }[] };
  return (data.data ?? []).find((p) => p.name === name)?.id ?? null;
}

async function katanaVariantBySku(sku: string): Promise<{ id: number; product_id: number } | null> {
  const data = (await katanaFetch(
    `/v1/variants?sku=${encodeURIComponent(sku)}&limit=1`
  )) as { data?: { id: number; product_id: number; sku: string }[] };
  return data.data?.[0] ?? null;
}

async function katanaVariantsByProductId(productId: number): Promise<KatanaVariantRaw[]> {
  const data = (await katanaFetch(
    `/v1/variants?product_id=${productId}&limit=500`
  )) as { data?: KatanaVariantRaw[] };
  return data.data ?? [];
}

// Patch en parallèle par lots de N
async function patchVariantsConfigAttributes(
  variants: { id: number; taille: string; couleurNom: string }[],
  errors: string[]
) {
  const CONCURRENCY = 8;
  for (let i = 0; i < variants.length; i += CONCURRENCY) {
    await Promise.all(
      variants.slice(i, i + CONCURRENCY).map(async (v) => {
        try {
          await katanaFetch(`/v1/variants/${v.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              config_attributes: CONFIG_ATTRS_TAILLE_COULEUR(v.taille, v.couleurNom),
            }),
          });
        } catch (e) {
          errors.push(`PATCH config variant ${v.id}: ${(e as Error).message}`);
        }
      })
    );
  }
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

type KatanaFormatResult = {
  katanaProductId: number;
  variantsTotal: number;
  variantsPatched: number;
  recipesCreated: number;
  recipesSkipped: number;
};
type KatanaConfig = Record<string, KatanaFormatResult>;

// ============ Endpoint ============

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

  try {

  for (const fmt of FORMATS) {
    const formatSku = fmt.sku as FormatSku;
    const productName = `Bague personnalisée — ${fmt.nom}`;

    // Toutes les combinaisons pour ce format
    const allCombos = TAILLES.flatMap((t) =>
      COULEURS.map((c) => ({
        persoSku: `PERSO-${fmt.sku}-${t}-${c.sku}`,
        taille: t,
        couleurSku: c.sku,
        couleurNom: c.nom,
      }))
    );

    try {
      // ── 1. Trouver ou créer le produit Katana ──────────────────────────────
      let katanaProductId = await findKatanaProductByName(productName);

      if (!katanaProductId) {
        // Création simple : produit seul, sans configs ni variants dans le payload
        // (certains champs comme configs peuvent provoquer des réponses non-JSON)
        const created = (await katanaFetch("/v1/products", {
          method: "POST",
          body: JSON.stringify({
            name: productName,
            is_sellable: true,
            is_producible: true,
          }),
        })) as { id?: number };
        if (!created?.id) throw new Error(`Katana n'a pas retourné d'ID pour le produit "${productName}"`);
        katanaProductId = created.id;
      }

      // ── 2. Récupérer les variants existants ────────────────────────────────
      const fgVariants = await katanaVariantsByProductId(katanaProductId);
      const fgBySku = new Map<string, { id: number; hasConfig: boolean }>(
        fgVariants
          .filter((v) => v.sku)
          .map((v) => [
            v.sku!,
            {
              id: v.id,
              hasConfig: (v.config_attributes?.length ?? 0) > 0,
            },
          ])
      );

      // ── 3. Créer les variants manquants (SKU uniquement) ─────────────────
      const missing = allCombos.filter((c) => !fgBySku.has(c.persoSku));
      for (const m of missing) {
        try {
          const v = (await katanaFetch("/v1/variants", {
            method: "POST",
            body: JSON.stringify({ product_id: katanaProductId, sku: m.persoSku }),
          })) as { id?: number };
          if (v?.id) fgBySku.set(m.persoSku, { id: v.id, hasConfig: false });
        } catch (e) {
          errors.push(`Variant ${m.persoSku}: ${(e as Error).message}`);
        }
      }

      // ── 4. Patcher les variants existants sans config_attributes ───────────
      const toPatch: { id: number; taille: string; couleurNom: string }[] = [];
      for (const [sku, { id, hasConfig }] of fgBySku) {
        if (!hasConfig) {
          const parsed = parsePersoSku(sku);
          if (parsed) toPatch.push({ id, ...parsed });
        }
      }
      await patchVariantsConfigAttributes(toPatch, errors);

      // ── 5. Charger les matières via product_id (2 appels par format) ────────
      const mtrlBySku = new Map<string, number>();
      const firstMtrlSku = toMtrlSku(formatSku, 56, "ROUGE");
      if (firstMtrlSku) {
        const anchor = await katanaVariantBySku(firstMtrlSku);
        if (anchor) {
          const mtrlVariants = await katanaVariantsByProductId(anchor.product_id);
          for (const v of mtrlVariants) {
            if (v.sku) mtrlBySku.set(v.sku, v.id);
          }
        }
      }

      // ── 6. Construire les lignes de recettes ───────────────────────────────
      const recipeRows: { productVariantId: number; ingredientVariantId: number }[] = [];
      for (const combo of allCombos) {
        const fg = fgBySku.get(combo.persoSku);
        if (!fg) continue;

        const mtrlSku = toMtrlSku(formatSku, combo.taille, combo.couleurSku);
        if (!mtrlSku) {
          errors.push(`Mapping couleur manquant: ${combo.persoSku}`);
          continue;
        }

        let mtrlId = mtrlBySku.get(mtrlSku);
        if (!mtrlId) {
          try {
            const v = await katanaVariantBySku(mtrlSku);
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
        recipeRows.push({ productVariantId: fg.id, ingredientVariantId: mtrlId });
      }

      // ── 7. Créer uniquement les recettes manquantes ────────────────────────
      const existingData = (await katanaFetch(
        `/v1/recipes?product_id=${katanaProductId}&limit=500`
      )) as { data?: { product_variant_id: number; ingredient_variant_id: number }[] };

      const existingKeys = new Set(
        (existingData.data ?? []).map((r) => `${r.product_variant_id}-${r.ingredient_variant_id}`)
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
        variantsPatched: toPatch.length,
        recipesCreated,
        recipesSkipped: skipped,
      };
    } catch (e: unknown) {
      errors.push(`Format ${fmt.id}: ${(e as Error).message}`);
    }
  }

  await redisSet("perso:katana:config", JSON.stringify(katanaResultats));
  return NextResponse.json({ ok: true, katanaResultats, errors });

  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message, errors }, { status: 500 });
  }
}

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

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  await redisSet("perso:katana:config", "");
  return NextResponse.json({ ok: true });
}
