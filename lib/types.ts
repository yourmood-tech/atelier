export type Direction = "IN" | "OUT";

export type ScanRequest = {
  sku: string;
  direction: Direction;
  sessionId?: string | null;
  deviceName?: string | null;
};

export type ScanApiResponse = {
  ok: boolean;
  sku?: string;
  direction?: Direction;
  eventId?: string;
  error?: string;
  details?: unknown;
};
