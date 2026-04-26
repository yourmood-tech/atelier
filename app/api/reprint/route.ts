import { NextRequest, NextResponse } from "next/server";
import { getAtelierTunnelUrl } from "@/lib/shopify";

export async function POST(req: NextRequest) {
  const { orders, processes } = await req.json() as { orders: string; processes: string[] };

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

  // Fire-and-forget : lancer l'impression sans attendre la fin (évite le timeout Vercel)
  fetch(`${tunnelUrl}/reprint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders, processes }),
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    results: [{ order: "Impression lancée", copies: "—", processes: "vérifier les logs atelier" }],
  });
}
