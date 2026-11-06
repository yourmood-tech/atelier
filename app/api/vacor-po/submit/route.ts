import { NextRequest, NextResponse } from "next/server";
import { createKatanaPOWithRows } from "@/lib/katana";
import { setVacorTags } from "@/lib/shopify";
import { VACOR_COLOUR_LABEL, VACOR_SUPPLIER_ID, vacorColour, type VacorColour } from "@/lib/vacor";

type SubmitItem = {
  variantId: number;
  variantName: string;
  variantSku: string | null;
  quantity: number;
  pricePerUnit: number;
  orderIds: number[]; // commandes clientes qui ont amené cette ligne
};

// Crée un bon Katana par couleur (VAC-BLACK-…, VAC-PINKGOLD-…), étiquette les commandes clientes
// avec le n° du bon qui les concerne, et envoie le récapitulatif par email à Philippe.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items: SubmitItem[];
      orders?: { id: number; name: string }[];
      expectedArrival?: string | null;
    };
    const items = body.items ?? [];
    const orders = body.orders ?? [];
    if (!items.length) return NextResponse.json({ error: "Aucun article" }, { status: 400 });

    const groups = new Map<VacorColour, SubmitItem[]>();
    for (const it of items) {
      const c = vacorColour(it.variantSku, it.variantName);
      groups.set(c, [...(groups.get(c) ?? []), it]);
    }

    const orderName = new Map(orders.map((o) => [o.id, o.name]));
    const created: { colour: VacorColour; label: string; poNumber: string; poId: number; qty: number; total: number; orderNames: string[] }[] = [];
    const tagsByOrder = new Map<number, string[]>();

    for (const colour of ["BLACK", "PINKGOLD", "YELLOWGOLD", "AUTRE"] as VacorColour[]) {
      const rows = groups.get(colour);
      if (!rows?.length) continue;
      const orderIds = [...new Set(rows.flatMap((r) => r.orderIds))];
      const names = orderIds.map((id) => orderName.get(id)).filter(Boolean) as string[];
      const note = `Traitement Vacor ${VACOR_COLOUR_LABEL[colour]}${names.length ? ` — commandes ${names.join(", ")}` : ""}`;
      const po = await createKatanaPOWithRows(
        VACOR_SUPPLIER_ID,
        rows.map((r) => ({ variantId: r.variantId, quantity: r.quantity, pricePerUnit: r.pricePerUnit })),
        body.expectedArrival ?? null,
        colour === "AUTRE" ? "VAC" : `VAC-${colour}`,
        note
      );
      created.push({
        colour,
        label: VACOR_COLOUR_LABEL[colour],
        poNumber: po.number,
        poId: po.id,
        qty: rows.reduce((s, r) => s + r.quantity, 0),
        total: rows.reduce((s, r) => s + r.quantity * r.pricePerUnit, 0),
        orderNames: names,
      });
      for (const id of orderIds) tagsByOrder.set(id, [...(tagsByOrder.get(id) ?? []), po.number]);
    }

    const tagResults = await Promise.allSettled(
      [...tagsByOrder.entries()].map(([id, nums]) => setVacorTags(id, nums))
    );
    const tagFailures = tagResults.filter((r) => r.status === "rejected").length;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const blocks = created
        .map((c) => {
          const rows = groups.get(c.colour)!
            .map((r) => `<tr><td style="padding:4px 0;border-bottom:1px solid #f0f0f0">${r.variantName}</td><td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;color:#555">${r.variantSku ?? "—"}</td><td style="padding:4px 0;border-bottom:1px solid #f0f0f0;text-align:right">${r.quantity}</td></tr>`)
            .join("");
          return `<h3 style="margin:20px 0 4px">${c.label} — ${c.poNumber}</h3>
            <p style="margin:0;color:#555">${c.qty} pièce(s) · CHF ${c.total.toFixed(2)}${c.orderNames.length ? ` · ${c.orderNames.join(", ")}` : ""}</p>
            <table style="border-collapse:collapse;width:100%;margin-top:8px">${rows}</table>`;
        })
        .join("");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "katana@yourmood.net",
          to: "philippe@yourmood.net",
          subject: `🎨 Bon(s) Vacor ${created.map((c) => c.poNumber).join(" + ")}`,
          html: `<div style="font-family:sans-serif;max-width:600px;color:#111"><h2 style="margin-bottom:4px">🎨 Bon(s) de traitement Vacor créé(s)</h2>${blocks}</div>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, pos: created, taggedOrders: tagsByOrder.size - tagFailures, tagFailures });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
