import type { Direction } from "./types";

type KatanaMovementInput = {
  sku: string;
  direction: Direction;
  quantity: number;
  locationId?: string | null;
};

export async function sendStockMovementToKatana(input: KatanaMovementInput) {
  const baseUrl = process.env.KATANA_BASE_URL!;
  const apiKey = process.env.KATANA_API_KEY!;
  const defaultLocationId = process.env.KATANA_DEFAULT_LOCATION_ID ?? null;

  const locationId = input.locationId ?? defaultLocationId;

  if (!locationId) {
    throw new Error("KATANA_DEFAULT_LOCATION_ID manquant");
  }

  const quantitySigned =
    input.direction === "OUT" ? -Math.abs(input.quantity) : Math.abs(input.quantity);

  const payload = {
    sku: input.sku,
    quantity: quantitySigned,
    location_id: locationId,
    reason: "scanner_mvp",
  };

  const res = await fetch(`${baseUrl}/YOUR_STOCK_MOVEMENT_ENDPOINT`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data?.message === "string" ? data.message : "Erreur Katana";
    throw new Error(message);
  }

  return data;
}
