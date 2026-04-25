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

  try {
    const res = await fetch(`${tunnelUrl}/reprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders, processes }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`Atelier server ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ok: true, results: data.results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
