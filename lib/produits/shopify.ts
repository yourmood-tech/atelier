const DOMAIN = process.env.MOOD_SHOPIFY_DOMAIN;
const TOKEN = process.env.MOOD_SHOPIFY_ACCESS_TOKEN;
const API = `https://${DOMAIN}/admin/api/2024-10`;

async function shopifyFetch(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "X-Shopify-Access-Token": TOKEN!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

// ============ FACTORY — crée un client Shopify pour n'importe quel store ============
export function makeShopifyClient(domain: string, token: string) {
  const api = `https://${domain}/admin/api/2024-10`;

  async function fetch_(method: string, path: string, body?: unknown) {
    const res = await fetch(`${api}${path}`, {
      method,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { status: res.status, ok: res.ok, data };
  }

  return {
    creerProduit: (payload: unknown) => fetch_("POST", "/products.json", payload),

    setCoutAchat: (inventoryItemId: number, cout: number) =>
      fetch_("PUT", `/inventory_items/${inventoryItemId}.json`, {
        inventory_item: { id: inventoryItemId, cost: String(cout) },
      }),

    listerLocations: async () => {
      const res = await fetch_("GET", "/locations.json");
      if (res.ok && (res.data as { locations?: { active?: boolean }[] })?.locations?.length) {
        return (res.data as { locations: { id: number; name: string; active?: boolean }[] }).locations.filter(
          (l) => l.active !== false
        );
      }
      return null;
    },

    listerLocationsViaInventaire: async (inventoryItemId: number) => {
      const res = await fetch_("GET", `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`);
      if (
        res.ok &&
        (res.data as { inventory_levels?: { location_id: number }[] })?.inventory_levels?.length
      ) {
        const levels = (res.data as { inventory_levels: { location_id: number }[] }).inventory_levels;
        const ids = [...new Set(levels.map((l) => l.location_id))];
        return ids.map((id) => ({ id, name: `location_${id}` }));
      }
      return [];
    },

    setStock: (locationId: number, inventoryItemId: number, qty: number) =>
      fetch_("POST", "/inventory_levels/set.json", {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: qty,
      }),

    listerCanaux: async () => {
      const res = await fetch_("GET", "/publications.json");
      return res.ok
        ? ((res.data as { publications?: { id: number }[] }).publications || [])
        : [];
    },

    publierSurCanal: (publicationId: number, productId: number) =>
      fetch_(
        "POST",
        `/publications/${publicationId}/products.json`,
        { product_listing: { product_id: productId } }
      ),

    ajouterImage: (
      productId: number,
      base64: string,
      filename: string | undefined,
      position: number | undefined,
      alt: string | undefined
    ) =>
      fetch_("POST", `/products/${productId}/images.json`, {
        image: {
          attachment: base64,
          filename: filename || `photo-${position}.jpg`,
          position: position || 1,
          alt: alt || "",
        },
      }),

    ajouterImageParUrl: (
      productId: number,
      src: string,
      position: number | undefined,
      alt: string | undefined,
      filename?: string
    ) => {
      const image: Record<string, unknown> = {
        src,
        position: position || 1,
        alt: alt || "",
      };
      if (filename) image.filename = filename;
      return fetch_("POST", `/products/${productId}/images.json`, { image });
    },

    ajouterProduitAUneCollection: async (
      productId: number,
      titre: string,
      tagsExistants: string,
      genererDescription: (titre: string, tag: string) => Promise<string>
    ) => {
      const titreNorm = titre.trim();
      if (!titreNorm)
        return { ok: false, collectionTitre: titre, tag: "", cree: false, erreur: "titre vide" };

      const tag = slugCollection(titreNorm);
      if (!tag)
        return { ok: false, collectionTitre: titreNorm, tag: "", cree: false, erreur: "tag vide" };

      // 1. Tag → produit
      const tagsArray = (tagsExistants || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tagsArray.map((t) => t.toLowerCase()).includes(tag.toLowerCase())) {
        tagsArray.push(tag);
      }
      const nouveauTagsCsv = tagsArray.join(", ");
      const updateTags = await fetch_("PUT", `/products/${productId}.json`, {
        product: { id: productId, tags: nouveauTagsCsv },
      });
      if (!updateTags.ok)
        return {
          ok: false,
          collectionTitre: titreNorm,
          tag,
          cree: false,
          erreur: `ajout du tag '${tag}' au produit échoué (HTTP ${updateTags.status})`,
        };

      // 2. Cherche si une smart/custom collection existe déjà avec ce titre
      let existanteId: number | null = null;
      let existanteType: "custom" | "smart" | null = null;
      const resSmart = await fetch_(
        "GET",
        `/smart_collections.json?title=${encodeURIComponent(titreNorm)}&limit=50`
      );
      if (resSmart.ok) {
        const list =
          (resSmart.data as { smart_collections?: { id: number; title: string }[] })
            .smart_collections || [];
        const exact = list.find(
          (c) => c.title.trim().toLowerCase() === titreNorm.toLowerCase()
        );
        if (exact) { existanteId = exact.id; existanteType = "smart"; }
      }
      if (!existanteId) {
        const resCustom = await fetch_(
          "GET",
          `/custom_collections.json?title=${encodeURIComponent(titreNorm)}&limit=50`
        );
        if (resCustom.ok) {
          const list =
            (resCustom.data as { custom_collections?: { id: number; title: string }[] })
              .custom_collections || [];
          const exact = list.find(
            (c) => c.title.trim().toLowerCase() === titreNorm.toLowerCase()
          );
          if (exact) { existanteId = exact.id; existanteType = "custom"; }
        }
      }

      if (existanteId && existanteType === "smart") {
        return { ok: true, collectionId: existanteId, collectionTitre: titreNorm, tag, cree: false };
      }
      if (existanteId && existanteType === "custom") {
        return {
          ok: true,
          collectionId: existanteId,
          collectionTitre: titreNorm,
          tag,
          cree: false,
          erreur: `collection manuelle avec ce titre existe déjà — tag '${tag}' ajouté au produit mais collection auto non créée`,
        };
      }

      // 3. Description SEO via callback
      let descriptionHtml = "";
      try {
        descriptionHtml = await genererDescription(titreNorm, tag);
      } catch {
        descriptionHtml = `<p>${titreNorm}</p>`;
      }

      // 4. Création smart collection avec règle tag
      const creation = await fetch_("POST", "/smart_collections.json", {
        smart_collection: {
          title: titreNorm,
          body_html: descriptionHtml,
          published: true,
          rules: [{ column: "tag", relation: "equals", condition: tag }],
          disjunctive: false,
        },
      });
      if (!creation.ok)
        return {
          ok: false,
          collectionTitre: titreNorm,
          tag,
          cree: false,
          erreur: `création smart collection échouée (HTTP ${creation.status})`,
        };
      const sc = (creation.data as { smart_collection?: { id: number } }).smart_collection;
      if (!sc?.id)
        return {
          ok: false,
          collectionTitre: titreNorm,
          tag,
          cree: false,
          erreur: "création smart collection sans id",
        };

      return { ok: true, collectionId: sc.id, collectionTitre: titreNorm, tag, cree: true };
    },
  };
}

// ============ EXPORTS LEGACY — Mood Collection par défaut (backward compat) ============
export async function creerProduit(payload: unknown) {
  return shopifyFetch("POST", "/products.json", payload);
}

export async function setCoutAchat(inventoryItemId: number, cout: number) {
  return shopifyFetch("PUT", `/inventory_items/${inventoryItemId}.json`, {
    inventory_item: { id: inventoryItemId, cost: String(cout) },
  });
}

export async function listerLocations() {
  const res = await shopifyFetch("GET", "/locations.json");
  if (res.ok && (res.data as { locations?: { active?: boolean }[] })?.locations?.length) {
    return (res.data as { locations: { id: number; name: string; active?: boolean }[] }).locations.filter(
      (l) => l.active !== false
    );
  }
  return null;
}

export async function listerLocationsViaInventaire(inventoryItemId: number) {
  const res = await shopifyFetch(
    "GET",
    `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`
  );
  if (
    res.ok &&
    (res.data as { inventory_levels?: { location_id: number }[] })?.inventory_levels?.length
  ) {
    const levels = (res.data as { inventory_levels: { location_id: number }[] }).inventory_levels;
    const ids = [...new Set(levels.map((l) => l.location_id))];
    return ids.map((id) => ({ id, name: `location_${id}` }));
  }
  return [];
}

export async function setStock(
  locationId: number,
  inventoryItemId: number,
  qty: number
) {
  return shopifyFetch("POST", "/inventory_levels/set.json", {
    location_id: locationId,
    inventory_item_id: inventoryItemId,
    available: qty,
  });
}

export async function listerCanaux() {
  const res = await shopifyFetch("GET", "/publications.json");
  return res.ok
    ? ((res.data as { publications?: { id: number }[] }).publications || [])
    : [];
}

export async function publierSurCanal(publicationId: number, productId: number) {
  return shopifyFetch(
    "POST",
    `/publications/${publicationId}/products.json`,
    { product_listing: { product_id: productId } }
  );
}

// ============ COLLECTIONS ============

// Slug standard Mood pour un titre de collection thématique.
// Ex: "Coffrets de juin 2026 - On fête la musique" → "coffrets-de-juin-2026-on-fete-la-musique"
export function slugCollection(titre: string): string {
  return titre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Cherche une collection (custom OU smart) par titre exact. Retourne {id, type} ou null.
export async function trouverCollectionParTitre(
  titre: string
): Promise<{ id: number; type: "custom" | "smart" } | null> {
  const titreNorm = titre.trim();
  if (!titreNorm) return null;
  // Custom collections d'abord
  const resCustom = await shopifyFetch(
    "GET",
    `/custom_collections.json?title=${encodeURIComponent(titreNorm)}&limit=50`
  );
  if (resCustom.ok) {
    const list = (resCustom.data as { custom_collections?: { id: number; title: string }[] })
      .custom_collections || [];
    const exact = list.find(
      (c) => c.title.trim().toLowerCase() === titreNorm.toLowerCase()
    );
    if (exact) return { id: exact.id, type: "custom" };
  }
  // Smart collections en fallback
  const resSmart = await shopifyFetch(
    "GET",
    `/smart_collections.json?title=${encodeURIComponent(titreNorm)}&limit=50`
  );
  if (resSmart.ok) {
    const list = (resSmart.data as { smart_collections?: { id: number; title: string }[] })
      .smart_collections || [];
    const exact = list.find(
      (c) => c.title.trim().toLowerCase() === titreNorm.toLowerCase()
    );
    if (exact) return { id: exact.id, type: "smart" };
  }
  return null;
}

// Crée une custom collection vide avec le titre donné. Retourne {id} ou erreur.
export async function creerCollection(titre: string) {
  return shopifyFetch("POST", "/custom_collections.json", {
    custom_collection: {
      title: titre.trim(),
      published: true,
    },
  });
}

// Ajoute un produit à une custom collection via Collect. Retourne {ok, status, data}.
// Note : ne marche pas sur smart collections (elles sont basées sur des règles auto).
export async function ajouterProduitACollection(
  productId: number,
  collectionId: number
) {
  return shopifyFetch("POST", "/collects.json", {
    collect: { product_id: productId, collection_id: collectionId },
  });
}

// Crée une smart collection (automatique) basée sur un tag.
// La règle = "tous les produits portant le tag X rejoignent la collection".
export async function creerSmartCollection(
  titre: string,
  tag: string,
  descriptionHtml: string
) {
  return shopifyFetch("POST", "/smart_collections.json", {
    smart_collection: {
      title: titre.trim(),
      body_html: descriptionHtml,
      published: true,
      rules: [
        {
          column: "tag",
          relation: "equals",
          condition: tag,
        },
      ],
      disjunctive: false, // toutes les règles doivent matcher (ici on n'en a qu'une, donc indifférent)
    },
  });
}

// PUT les tags d'un produit (écrase l'existant). Retourne {ok, status, data}.
export async function setProductTags(productId: number, tagsCsv: string) {
  return shopifyFetch("PUT", `/products/${productId}.json`, {
    product: { id: productId, tags: tagsCsv },
  });
}

// Workflow complet (NOUVELLE VERSION) :
// 1. Génère un tag-slug depuis le titre
// 2. Ajoute ce tag au produit
// 3. Si la smart collection avec ce titre n'existe pas → la crée avec règle tag + description SEO IA
// 4. Sinon → ne touche pas à la collection (le tag fait le job, Shopify met à jour auto)
//
// genererDescription : callback async qui génère le HTML SEO (l'appelant fournit pour ne pas
// recoupler le helper Shopify avec un appel Gemini direct).
export async function ajouterProduitAUneCollection(
  productId: number,
  titre: string,
  tagsExistants: string,
  genererDescription: (titre: string, tag: string) => Promise<string>
): Promise<{
  ok: boolean;
  collectionId?: number;
  collectionTitre: string;
  tag: string;
  cree: boolean;
  erreur?: string;
}> {
  const titreNorm = titre.trim();
  if (!titreNorm)
    return { ok: false, collectionTitre: titre, tag: "", cree: false, erreur: "titre vide" };

  const tag = slugCollection(titreNorm);
  if (!tag)
    return { ok: false, collectionTitre: titreNorm, tag: "", cree: false, erreur: "tag vide" };

  // 1. Ajoute le tag au produit (concatène avec les tags existants)
  const tagsArray = (tagsExistants || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tagsArray.map((t) => t.toLowerCase()).includes(tag.toLowerCase())) {
    tagsArray.push(tag);
  }
  const nouveauTagsCsv = tagsArray.join(", ");
  const updateTags = await setProductTags(productId, nouveauTagsCsv);
  if (!updateTags.ok) {
    return {
      ok: false,
      collectionTitre: titreNorm,
      tag,
      cree: false,
      erreur: `ajout du tag '${tag}' au produit échoué (HTTP ${updateTags.status})`,
    };
  }

  // 2. Cherche si une smart collection avec ce titre existe déjà
  const existante = await trouverCollectionParTitre(titreNorm);
  if (existante && existante.type === "smart") {
    // Collection auto déjà créée — le tag fera le job, rien d'autre à faire
    return {
      ok: true,
      collectionId: existante.id,
      collectionTitre: titreNorm,
      tag,
      cree: false,
    };
  }
  if (existante && existante.type === "custom") {
    // Une custom existe avec ce titre — on la laisse, mais on log que le tag est ajouté
    return {
      ok: true,
      collectionId: existante.id,
      collectionTitre: titreNorm,
      tag,
      cree: false,
      erreur: `collection manuelle avec ce titre existe déjà — tag '${tag}' ajouté au produit mais collection auto non créée`,
    };
  }

  // 3. Génère la description SEO via le callback fourni
  let descriptionHtml = "";
  try {
    descriptionHtml = await genererDescription(titreNorm, tag);
  } catch (e) {
    descriptionHtml = `<p>${titreNorm}</p>`;
  }

  // 4. Crée la smart collection
  const creation = await creerSmartCollection(titreNorm, tag, descriptionHtml);
  if (!creation.ok) {
    return {
      ok: false,
      collectionTitre: titreNorm,
      tag,
      cree: false,
      erreur: `création smart collection échouée (HTTP ${creation.status})`,
    };
  }
  const sc = (creation.data as { smart_collection?: { id: number } }).smart_collection;
  if (!sc?.id) {
    return {
      ok: false,
      collectionTitre: titreNorm,
      tag,
      cree: false,
      erreur: "création smart collection sans id",
    };
  }

  return {
    ok: true,
    collectionId: sc.id,
    collectionTitre: titreNorm,
    tag,
    cree: true,
  };
}

export async function ajouterImage(
  productId: number,
  base64: string,
  filename: string | undefined,
  position: number | undefined,
  alt: string | undefined
) {
  return shopifyFetch("POST", `/products/${productId}/images.json`, {
    image: {
      attachment: base64,
      filename: filename || `photo-${position}.jpg`,
      position: position || 1,
      alt: alt || "",
    },
  });
}

export async function ajouterImageParUrl(
  productId: number,
  src: string,
  position: number | undefined,
  alt: string | undefined,
  filename?: string
) {
  const image: Record<string, unknown> = {
    src,
    position: position || 1,
    alt: alt || "",
  };
  if (filename) image.filename = filename;
  return shopifyFetch("POST", `/products/${productId}/images.json`, { image });
}
