import type { Direction } from "./types";

type KatanaMovementInput = {
  sku: string;
  direction: Direction;
  quantity: number;
  locationId?: string | null;
};

export async function sendStockMovementToKatana(input: KatanaMovementInput) {
  return {
    mock: true,
    received: input,
    ts: new Date().toISOString(),
  };
}
