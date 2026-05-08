import { NextRequest, NextResponse } from "next/server";
import { getAtelierTunnelUrl } from "@/lib/shopify";

export async function POST(req: NextRequest) {
  const { orders, processes, store } = await req.json() as { orders: string; processes: string[]; store?: string };

  const tunnelUrl = await getAtelierTunnelUrl();
  if (!tunnelUrl) {
    return NextResponse.json(
      { ok: false, error: "Serveur atelier non démarré — lance npm run start sur le Mac de l'atelier" },
      { status: 503 }
    );
  }

  // Vérifier que le serveur répond avant de lancer (timeout court)
  try {
    await fetch(`${tunnelUrl}/health`, { signal: AbortSignal.timeout(5_000) });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Serveur atelier injoignable — vérifier que le tunnel est actif" },
      { status: 502 }
    );
  }

  const printRes = await fetch(`${tunnelUrl}/reprint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders, processes, store }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!printRes?.ok) {
    return NextResponse.json(
      { ok: false, error: "Serveur atelier n'a pas répondu" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, results: [{ order: "Impression lancée", copies: "—", processes: "vérifier les logs atelier" }] });
}
