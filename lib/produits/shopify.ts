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
