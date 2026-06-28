import { NextRequest, NextResponse } from "next/server";
import { buildColoralOrder, type ColoralItem } from "@/lib/coloral/order";

export const maxDuration = 60;

// POST { items: { sku, qty }[] } → fichier .xlsx (gabarit Coloral rempli).
// Les lignes non placées (couleur/taille/type introuvable) sont renvoyées dans
// l'en-tête X-Coloral-Unmatched (JSON) pour être affichées sans perdre le fichier.
export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: ColoralItem[] };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Aucune ligne Coloral à exporter" }, { status: 400 });
    }

    const { buffer, unmatched, filledLines, totalQty } = await buildColoralOrder(items);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="commande-coloral.xlsx"`,
        "X-Coloral-Unmatched": encodeURIComponent(JSON.stringify(unmatched)),
        "X-Coloral-Filled": String(filledLines),
        "X-Coloral-Total-Qty": String(totalQty),
      },
    });
  } catch (err) {
    console.error("[coloral-order] ERROR:", err instanceof Error ? err.stack ?? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
