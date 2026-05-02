import { NextRequest, NextResponse } from "next/server";
import { createKatanaPOWithRows } from "@/lib/katana";
import { addOrderTag, getOrderById } from "@/lib/shopify";
import { getKlaviyoProfileLocale, generateBackorderEmail, generateFollowUpEmail, sendViaKlaviyo } from "@/lib/email";
import type { BackorderAnalysis, ShopifyVariantInfo } from "@/lib/types";

function formatDeliveryDate(dateStr: string | null | undefined): string {
  const d = dateStr ? new Date(dateStr) : (() => { const n = new Date(); n.setDate(n.getDate() + 21); return n; })();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

type SubmitItem = {
  variantId: number;
  variantName: string;
  variantSku: string | null;
  quantity: number;
  pricePerUnit: number;
};

export async function POST(req: NextRequest) {
  try {
    type ScannedPair = { orderId: number; productId: number; productName: string };

    const body = await req.json() as {
      supplierId: number;
      supplierName: string;
      items: SubmitItem[];
      shopifyOrderIds?: number[];
      scannedPairs?: ScannedPair[];
    };

    const { supplierId, supplierName, items, shopifyOrderIds, scannedPairs } = body;

    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: "supplierId et items requis" }, { status: 400 });
    }

    const po = await createKatanaPOWithRows(
      supplierId,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, pricePerUnit: i.pricePerUnit }))
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const totalCost = items.reduce((sum, i) => sum + i.quantity * i.pricePerUnit, 0);

      const itemRows = items
        .map(
          (item) =>
            `<tr>
              <td style="padding:5px 0;border-bottom:1px solid #f0f0f0">${item.variantName}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;color:#555">${item.variantSku ?? "—"}</td>
              <td style="padding:5px 0;border-bottom:1px solid #f0f0f0;text-align:right">${item.quantity}</td>
              <td style="padding:5px 0 5px 8px;border-bottom:1px solid #f0f0f0;text-align:right">${item.pricePerUnit.toFixed(2)}</td>
              <td style="padding:5px 0 5px 8px;border-bottom:1px solid #f0f0f0;text-align:right">${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
            </tr>`
        )
        .join("");

      const html = `
        <div style="font-family:sans-serif;max-width:600px;color:#111">
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
                <th style="padding:5px 0 5px 8px;text-align:right;font-weight:600">Prix/u</th>
                <th style="padding:5px 0 5px 8px;text-align:right;font-weight:600">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:8px 0;font-weight:600">Total</td>
                <td style="padding:8px 0;text-align:right;font-weight:600">${totalQty}</td>
                <td></td>
                <td style="padding:8px 0 8px 8px;text-align:right;font-weight:600">CHF ${totalCost.toFixed(2)}</td>
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
          subject: `📦 PO Icelea ${po.number} — ${items.length} réf. · CHF ${totalCost.toFixed(2)}`,
          html,
        }),
      });
    }

    // Tag all linked Shopify orders with PO number and estimated delivery date
    if (shopifyOrderIds?.length) {
      const deliveryFormatted = formatDeliveryDate(po.deliveryDate);
      await Promise.allSettled(
        shopifyOrderIds.flatMap((orderId) => [
          addOrderTag(orderId, `Icelea-PO:${po.number}`),
          addOrderTag(orderId, `Icelea-livraison:${deliveryFormatted}`),
        ])
      );
    }

    // Send OOS emails to customers for each scanned order+product pair
    const emailDiagnostics: { pair: string; status: string; error?: string }[] = [];

    console.log(`[icelea-po/submit] scannedPairs: ${scannedPairs?.length ?? 0}`, JSON.stringify(scannedPairs ?? []));

    if (scannedPairs?.length) {
      const uniqueOrderIds = [...new Set(scannedPairs.map((p) => p.orderId))];

      const orderResults = await Promise.allSettled(
        uniqueOrderIds.map((id) => getOrderById(String(id)))
      );
      const orderMap = new Map<number, Awaited<ReturnType<typeof getOrderById>>>();
      orderResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          orderMap.set(uniqueOrderIds[i], result.value);
        } else {
          console.error(`[icelea-po/submit] getOrderById(${uniqueOrderIds[i]}) failed:`, result.reason);
        }
      });

      // Override locales from Klaviyo for accuracy
      await Promise.allSettled(
        Array.from(orderMap.values()).map(async (order) => {
          const locale = await getKlaviyoProfileLocale(order.customer.email);
          if (locale) order.customer.locale = locale;
        })
      );

      const needsFollowUp = po.deliveryDate
        ? Math.ceil((new Date(po.deliveryDate).getTime() - Date.now()) / 86_400_000) > 12
        : false;

      const emailResults = await Promise.allSettled(
        scannedPairs.map(async (pair) => {
          const pairKey = `order:${pair.orderId} product:${pair.productId}`;
          const order = orderMap.get(pair.orderId);
          if (!order) {
            emailDiagnostics.push({ pair: pairKey, status: "skipped", error: "order not found in orderMap" });
            return;
          }

          const product: ShopifyVariantInfo = {
            variantId: 0,
            productId: pair.productId,
            productTitle: pair.productName,
            variantTitle: "",
            sku: "",
          };

          const analysis: BackorderAnalysis = {
            order,
            product,
            materials: [],
            purchaseOrder: null,
            estimatedDelivery: po.deliveryDate ?? null,
            leadTimeMin: null,
            leadTimeMax: null,
            tagOnly: false,
            supplierName,
            emailDraft: null,
            followUpEmailDraft: null,
          };

          const [email, followUp] = await Promise.all([
            generateBackorderEmail(analysis),
            needsFollowUp ? generateFollowUpEmail(analysis) : Promise.resolve(null),
          ]);

          await sendViaKlaviyo({
            email: order.customer.email,
            firstName: order.customer.firstName,
            subject: email.subject,
            greeting: email.greeting,
            body: email.body,
            sign_off: email.sign_off,
            orderId: order.name,
            productTitle: pair.productName,
            estimatedDelivery: po.deliveryDate ?? null,
            supplierName,
            followupSubject: followUp?.subject ?? null,
            followupGreeting: followUp?.greeting ?? null,
            followupBody: followUp?.body ?? null,
            followupSignOff: followUp?.sign_off ?? null,
          });

          emailDiagnostics.push({ pair: pairKey, status: "sent" });
        })
      );

      emailResults.forEach((result, i) => {
        if (result.status === "rejected") {
          const pairKey = `order:${scannedPairs[i].orderId} product:${scannedPairs[i].productId}`;
          const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          console.error(`[icelea-po/submit] email failed for ${pairKey}:`, errMsg);
          emailDiagnostics.push({ pair: pairKey, status: "error", error: errMsg });
        }
      });
    }

    console.log(`[icelea-po/submit] emailDiagnostics:`, JSON.stringify(emailDiagnostics));

    return NextResponse.json({
      ok: true,
      poId: po.id,
      poNumber: po.number,
      deliveryDate: po.deliveryDate,
      emailsSent: emailDiagnostics.filter(d => d.status === "sent").length,
      emailDiagnostics,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
