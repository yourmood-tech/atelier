import { NextRequest, NextResponse, after } from "next/server";
import { createKatanaPOWithRows } from "@/lib/katana";
import { addOrderTag, getOrderById } from "@/lib/shopify";
import { getKlaviyoProfileLocale, generateBackorderEmail, generateFollowUpEmail, sendViaKlaviyo } from "@/lib/email";
import type { BackorderAnalysis, ShopifyVariantInfo } from "@/lib/types";

// Concurrency limiter — runs tasks with at most `limit` in parallel
async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

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
      expectedArrival?: string | null;
    };

    const { supplierId, supplierName, items, shopifyOrderIds, scannedPairs, expectedArrival } = body;

    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: "supplierId et items requis" }, { status: 400 });
    }

    const po = await createKatanaPOWithRows(
      supplierId,
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, pricePerUnit: i.pricePerUnit })),
      expectedArrival
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
    // Tags are added sequentially per order to avoid read-modify-write race condition
    if (shopifyOrderIds?.length) {
      const deliveryFormatted = formatDeliveryDate(po.deliveryDate);
      await Promise.allSettled(
        shopifyOrderIds.map(async (orderId) => {
          await addOrderTag(orderId, `Icelea-PO:${po.number}`);
          await addOrderTag(orderId, `Icelea-livraison:${deliveryFormatted}`);
        })
      );
    }

    // Emails are sent after the response to avoid Vercel timeout with 100+ orders
    const pairsSnapshot = scannedPairs ?? [];
    const poSnapshot = { ...po };
    const supplierNameSnapshot = supplierName;

    console.log(`[icelea-po/submit] scannedPairs: ${pairsSnapshot.length}`, JSON.stringify(pairsSnapshot));

    if (pairsSnapshot.length) {
      after(async () => {
        console.log(`[icelea-po/submit] after() — processing ${pairsSnapshot.length} email(s)`);
        const uniqueOrderIds = [...new Set(pairsSnapshot.map((p) => p.orderId))];

        // Fetch orders 5 at a time to respect Shopify rate limits
        const orderResults = await pLimit(
          uniqueOrderIds.map((id) => () => getOrderById(String(id))),
          5
        );
        const orderMap = new Map<number, Awaited<ReturnType<typeof getOrderById>>>();
        orderResults.forEach((result, i) => {
          if (result.status === "fulfilled") {
            orderMap.set(uniqueOrderIds[i], result.value);
          } else {
            console.error(`[icelea-po/submit] getOrderById(${uniqueOrderIds[i]}) failed:`, result.reason);
          }
        });

        // Locale overrides 5 at a time
        await pLimit(
          Array.from(orderMap.values()).map((order) => async () => {
            const locale = await getKlaviyoProfileLocale(order.customer.email);
            if (locale) order.customer.locale = locale;
          }),
          5
        );

        const needsFollowUp = poSnapshot.deliveryDate
          ? Math.ceil((new Date(poSnapshot.deliveryDate).getTime() - Date.now()) / 86_400_000) > 12
          : false;

        // Process emails 3 at a time (each involves Claude + Klaviyo calls)
        await pLimit(
          pairsSnapshot.map((pair) => async () => {
            const pairKey = `order:${pair.orderId} product:${pair.productId}`;
            const order = orderMap.get(pair.orderId);
            if (!order) {
              console.warn(`[icelea-po/submit] skipped ${pairKey} — order not in orderMap`);
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
              estimatedDelivery: poSnapshot.deliveryDate ?? null,
              leadTimeMin: null,
              leadTimeMax: null,
              tagOnly: false,
              supplierName: supplierNameSnapshot,
              emailDraft: null,
              followUpEmailDraft: null,
            };

            console.log(`[icelea-po/submit] generating email for ${pairKey} locale=${order.customer.locale}`);
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
              estimatedDelivery: poSnapshot.deliveryDate ?? null,
              supplierName: supplierNameSnapshot,
              followupSubject: followUp?.subject ?? null,
              followupGreeting: followUp?.greeting ?? null,
              followupBody: followUp?.body ?? null,
              followupSignOff: followUp?.sign_off ?? null,
            });
            console.log(`[icelea-po/submit] sent email for ${pairKey}`);
          }),
          3
        );

        console.log(`[icelea-po/submit] after() — done`);
      });
    }

    return NextResponse.json({
      ok: true,
      poId: po.id,
      poNumber: po.number,
      deliveryDate: po.deliveryDate,
      emailsQueued: pairsSnapshot.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
