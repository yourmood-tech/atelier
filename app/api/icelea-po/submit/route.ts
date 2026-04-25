import { NextRequest, NextResponse } from "next/server";
import { createKatanaPOWithRows } from "@/lib/katana";

type SubmitItem = {
  variantId: number;
  variantName: string;
  variantSku: string | null;
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      supplierId: number;
      supplierName: string;
      items: SubmitItem[];
    };

    const { supplierId, supplierName, items } = body;

    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: "supplierId et items requis" }, { status: 400 });
    }

    const po = await createKatanaPOWithRows(
      supplierId,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const itemRows = items
        .map(
          (item) =>
            `<tr>
              <td style="padding:5px 0;border-bottom:1px solid #f0f0f0">${item.variantName}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;color:#555">${item.variantSku ?? "—"}</td>
              <td style="padding:5px 0;border-bottom:1px solid #f0f0f0;text-align:right">${item.quantity}</td>
            </tr>`
        )
        .join("");

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

      const html = `
        <div style="font-family:sans-serif;max-width:560px;color:#111">
          <h2 style="margin-bottom:4px">📦 Bon de commande Icelea créé</h2>
          <p style="color:#555;margin-top:0">
            Fournisseur : <strong>${supplierName}</strong> &nbsp;—&nbsp;
            PO n° <strong>${po.number}</strong>
          </p>
          <table style="border-collapse:collapse;width:100%;margin-top:16px">
            <thead>
              <tr style="border-bottom:2px solid #111">
                <th style="padding:5px 0;text-align:left;font-weight:600">Article</th>
                <th style="padding:5px 8px;text-align:left;font-weight:600">SKU</th>
                <th style="padding:5px 0;text-align:right;font-weight:600">Qté</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:8px 0;font-weight:600">Total</td>
                <td style="padding:8px 0;text-align:right;font-weight:600">${totalQty}</td>
              </tr>
            </tfoot>
          </table>
          <p style="margin-top:20px;color:#888;font-size:12px">
            ${new Date().toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "katana@yourmood.net",
          to: "philippe@yourmood.net",
          subject: `📦 PO Icelea ${po.number} — ${items.length} référence(s), ${totalQty} pièce(s)`,
          html,
        }),
      });
    }

    return NextResponse.json({ ok: true, poId: po.id, poNumber: po.number });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
