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

    ajouterProduitAUneCollection: async (productId: number, titre: string) => {
      const titreNorm = titre.trim();
      if (!titreNorm)
        return { ok: false, collectionTitre: titre, cree: false, erreur: "titre vide" };

      let existanteId: number | null = null;
      let existanteType: "custom" | "smart" | null = null;

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
      if (!existanteId) {
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
      }

      let cree = false;
      if (!existanteId) {
        const creation = await fetch_("POST", "/custom_collections.json", {
          custom_collection: { title: titreNorm, published: true },
        });
        if (!creation.ok)
          return {
            ok: false,
            collectionTitre: titreNorm,
            cree: false,
            erreur: `création collection échouée (HTTP ${creation.status})`,
          };
        const cc = (creation.data as { custom_collection?: { id: number } })
          .custom_collection;
        if (!cc?.id)
          return {
            ok: false,
            collectionTitre: titreNorm,
            cree: false,
            erreur: "création collection sans id",
          };
        existanteId = cc.id;
        existanteType = "custom";
        cree = true;
      }

      if (existanteType === "smart")
        return {
          ok: false,
          collectionId: existanteId,
          collectionTitre: titreNorm,
          cree: false,
          erreur:
            "collection trouvée mais c'est une collection automatique — ajout manuel impossible",
        };

      const ajout = await fetch_("POST", "/collects.json", {
        collect: { product_id: productId, collection_id: existanteId },
      });
      if (!ajout.ok)
        return {
          ok: false,
          collectionId: existanteId,
          collectionTitre: titreNorm,
          cree,
          erreur: `ajout produit à la collection échoué (HTTP ${ajout.status})`,
        };

      return { ok: true, collectionId: existanteId, collectionTitre: titreNorm, cree };
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

// Workflow complet : trouve ou crée la collection puis ajoute le produit.
// Retourne { ok, collectionId, collectionTitre, cree, erreur? }
export async function ajouterProduitAUneCollection(
  productId: number,
  titre: string
): Promise<{
  ok: boolean;
  collectionId?: number;
  collectionTitre: string;
  cree: boolean;
  erreur?: string;
}> {
  const titreNorm = titre.trim();
  if (!titreNorm)
    return { ok: false, collectionTitre: titre, cree: false, erreur: "titre vide" };

  let existante = await trouverCollectionParTitre(titreNorm);
  let cree = false;

  if (!existante) {
    const creation = await creerCollection(titreNorm);
    if (!creation.ok) {
      return {
        ok: false,
        collectionTitre: titreNorm,
        cree: false,
        erreur: `création collection échouée (HTTP ${creation.status})`,
      };
    }
    const cc = (creation.data as { custom_collection?: { id: number } })
      .custom_collection;
    if (!cc?.id)
      return {
        ok: false,
        collectionTitre: titreNorm,
        cree: false,
        erreur: "création collection sans id",
      };
    existante = { id: cc.id, type: "custom" };
    cree = true;
  }

  if (existante.type === "smart")
    return {
      ok: false,
      collectionId: existante.id,
      collectionTitre: titreNorm,
      cree: false,
      erreur:
        "collection trouvée mais c'est une collection automatique — l'ajout manuel est impossible (Shopify gère son contenu via des règles).",
    };

  const ajout = await ajouterProduitACollection(productId, existante.id);
  if (!ajout.ok)
    return {
      ok: false,
      collectionId: existante.id,
      collectionTitre: titreNorm,
      cree,
      erreur: `ajout produit à la collection échoué (HTTP ${ajout.status})`,
    };

  return { ok: true, collectionId: existante.id, collectionTitre: titreNorm, cree };
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
