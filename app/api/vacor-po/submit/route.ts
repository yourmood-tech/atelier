import { NextRequest, NextResponse } from "next/server";
import { createKatanaPOWithRows } from "@/lib/katana";
import { addOrderTags } from "@/lib/shopify";
import { TREATMENT_SUPPLIER_IDS, treatmentGroup, type TreatmentGroup } from "@/lib/vacor";

type SubmitItem = {
  variantId: number;
  variantName: string;
  variantSku: string | null;
  quantity: number;
  pricePerUnit: number;
  supplierId: number;
  orderIds: number[]; // commandes clientes qui ont amené cette ligne
};

// Crée un bon Katana par fournisseur et par couleur (VAC-BLACK-…, PC-MINERAL-…), étiquette chaque
// commande cliente avec le n° des bons qui la concernent, et envoie le récapitulatif à Philippe.
// Un bon déjà créé n'est pas annulé si le suivant échoue : la réponse liste ce qui a été fait.
export async function POST(req: NextRequest) {
  const created: { key: string; label: string; bg: string; poNumber: string; qty: number; total: number; orderNames: string[] }[] = [];
  try {
    const body = (await req.json()) as {
      items: SubmitItem[];
      orders?: { id: number; name: string }[];
      expectedArrival?: string | null;
    };
    const items = (body.items ?? []).filter((i) => TREATMENT_SUPPLIER_IDS.includes(i.supplierId));
    const orders = body.orders ?? [];
    if (!items.length) return NextResponse.json({ error: "Aucune pièce à traiter" }, { status: 400 });

    const groups = new Map<string, { g: TreatmentGroup; rows: SubmitItem[] }>();
    for (const it of items) {
      const g = treatmentGroup(it.supplierId, it.variantSku, it.variantName);
      const cur = groups.get(g.key) ?? { g, rows: [] };
      cur.rows.push(it);
      groups.set(g.key, cur);
    }

    const orderName = new Map(orders.map((o) => [o.id, o.name]));
    const tagsByOrder = new Map<number, string[]>();

    for (const { g, rows } of [...groups.values()].sort((a, b) => a.g.order - b.g.order)) {
      const orderIds = [...new Set(rows.flatMap((r) => r.orderIds))];
      const names = orderIds.map((id) => orderName.get(id)).filter(Boolean) as string[];
      const what = g.colour ? `Traitement ${g.supplierName} ${g.colour}` : `Découpe ${g.supplierName}`;
      const note = `${what}${names.length ? ` — commandes ${names.join(", ")}` : ""}`;
      const po = await createKatanaPOWithRows(
        g.supplierId,
        rows.map((r) => ({ variantId: r.variantId, quantity: r.quantity, pricePerUnit: r.pricePerUnit })),
        body.expectedArrival ?? null,
        g.prefix,
        note
      );
      created.push({
        key: g.key,
        label: g.colour ? `${g.supplierName} · ${g.colour}` : g.supplierName,
        bg: g.bg,
        poNumber: po.number,
        qty: rows.reduce((s, r) => s + r.quantity, 0),
        total: rows.reduce((s, r) => s + r.quantity * r.pricePerUnit, 0),
        orderNames: names,
      });
      for (const id of orderIds) tagsByOrder.set(id, [...(tagsByOrder.get(id) ?? []), `${g.tagPrefix}:${po.number}`]);
    }

    const tagResults = await Promise.allSettled([...tagsByOrder.entries()].map(([id, tags]) => addOrderTags(id, tags)));
    const tagFailures = tagResults.filter((r) => r.status === "rejected").length;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const blocks = created
        .map((c) => {
          const rows = groups.get(c.key)!.rows
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
          subject: `🎨 Bon(s) fournisseurs ${created.map((c) => c.poNumber).join(" + ")}`,
          html: `<div style="font-family:sans-serif;max-width:600px;color:#111"><h2 style="margin-bottom:4px">🎨 Bon(s) Technocut / Vacor / Positive Coating créé(s)</h2>${blocks}</div>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, pos: created, taggedOrders: tagsByOrder.size - tagFailures, tagFailures });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json(
      { error: created.length ? `${msg} — bon(s) déjà créé(s) : ${created.map((c) => c.poNumber).join(", ")}` : msg },
      { status: 500 }
    );
  }
}
