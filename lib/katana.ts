import type { Direction } from "./types";

type KatanaVariant = {
  id: number;
  sku: string;
  internal_barcode: string;
};

type KatanaMovementInput = {
  barcode: string; // ton scan
  direction: Direction;
  quantity: number;
};

const BASE_URL = process.env.KATANA_BASE_URL!;
const API_KEY = process.env.KATANA_API_KEY!;
const DEFAULT_LOCATION_ID = process.env.KATANA_DEFAULT_LOCATION_ID!;

// -----------------------------
// 1. Trouver le variant via barcode
// -----------------------------
async function findVariantByBarcode(barcode: string): Promise<KatanaVariant> {
  const res = await fetch(
    `${BASE_URL}/v1/product_variants?internal_barcode=${encodeURIComponent(barcode)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.message || `Erreur Katana lookup barcode: ${barcode}`
    );
  }

  if (!data?.data || data.data.length === 0) {
    throw new Error(`Barcode inconnu dans Katana: ${barcode}`);
  }

  return data.data[0];
}

// -----------------------------
// 2. Créer un mouvement de stock
// -----------------------------
async function createStockAdjustment(params: {
  variantId: number;
  quantity: number;
}) {
  const payload = {
    variant_id: params.variantId,
    location_id: Number(DEFAULT_LOCATION_ID),
    quantity: params.quantity,
    reason: "scanner_mvp",
  };

  const res = await fetch(`${BASE_URL}/v1/stock_adjustments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Erreur création stock adjustment");
  }

  return data;
}

// -----------------------------
// 3. Fonction principale
// -----------------------------
export async function sendStockMovementToKatana(
  input: KatanaMovementInput
) {
  // 1. Trouver le variant
  const variant = await findVariantByBarcode(input.barcode);

  // 2. Calcul quantité signée
  const quantitySigned =
    input.direction === "OUT"
      ? -Math.abs(input.quantity)
      : Math.abs(input.quantity);

  // 3. Créer mouvement
  const result = await createStockAdjustment({
    variantId: variant.id,
    quantity: quantitySigned,
  });

  return {
    success: true,
    variant_id: variant.id,
    barcode: input.barcode,
    quantity: quantitySigned,
    katana_response: result,
  };
}
