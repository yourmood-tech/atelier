import { NextRequest, NextResponse, after } from "next/server";
import { getOrderById } from "@/lib/shopify";
import { getKlaviyoProfileLocale, generateBackorderEmailMulti, generateFollowUpEmailMulti, sendViaKlaviyo } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

// POST /api/icelea-po/resend — resend Klaviyo events for an existing PO
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      poNumber: string;
      supplierName: string;
      deliveryDate: string | null;
    };

    const { poNumber, supplierName, deliveryDate } = body;
    if (!poNumber) return NextResponse.json({ error: "poNumber requis" }, { status: 400 });

    const { data: pairs, error } = await supabaseAdmin
      .from("icelea_po_pairs")
      .select("order_id, product_id, product_name")
      .eq("po_number", poNumber);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!pairs?.length) return NextResponse.json({ error: `Aucune paire trouvée pour PO ${poNumber}` }, { status: 404 });

    after(async () => {
      console.log(`[icelea-po/resend] processing ${pairs.length} pair(s) for PO ${poNumber}`);
      const uniqueOrderIds = [...new Set(pairs.map((p) => p.order_id as number))];

      const orderResults = await pLimit(
        uniqueOrderIds.map((id) => () => getOrderById(String(id))),
        5
      );
      const orderMap = new Map<number, Awaited<ReturnType<typeof getOrderById>>>();
      orderResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          orderMap.set(uniqueOrderIds[i], result.value);
        } else {
          console.error(`[icelea-po/resend] getOrderById(${uniqueOrderIds[i]}) failed:`, result.reason);
        }
      });

      await pLimit(
        Array.from(orderMap.values()).map((order) => async () => {
          const locale = await getKlaviyoProfileLocale(order.customer.email);
          if (locale) order.customer.locale = locale;
        }),
        5
      );

      const needsFollowUp = deliveryDate
        ? Math.ceil((new Date(deliveryDate).getTime() - Date.now()) / 86_400_000) > 12
        : false;

      type CustomerGroup = {
        email: string;
        firstName: string;
        locale: string;
        products: Array<{ productTitle: string; orderId: string }>;
      };
      const customerGroups = new Map<string, CustomerGroup>();

      for (const pair of pairs) {
        const order = orderMap.get(pair.order_id as number);
        if (!order) continue;
        const key = order.customer.email.toLowerCase();
        if (!customerGroups.has(key)) {
          customerGroups.set(key, {
            email: order.customer.email,
            firstName: order.customer.firstName,
            locale: order.customer.locale,
            products: [],
          });
        }
        customerGroups.get(key)!.products.push({
          productTitle: pair.product_name as string,
          orderId: order.name,
        });
      }

      const customerList = Array.from(customerGroups.values());
      console.log(`[icelea-po/resend] ${customerList.length} customer(s) to notify`);

      await pLimit(
        customerList.map((cust) => async () => {
          const [email, followUp] = await Promise.all([
            generateBackorderEmailMulti({
              firstName: cust.firstName,
              locale: cust.locale,
              products: cust.products,
              estimatedDelivery: deliveryDate,
              supplierName,
            }),
            needsFollowUp ? generateFollowUpEmailMulti({
              firstName: cust.firstName,
              locale: cust.locale,
              products: cust.products,
              estimatedDelivery: deliveryDate,
              supplierName,
            }) : Promise.resolve(null),
          ]);

          await sendViaKlaviyo({
            email: cust.email,
            firstName: cust.firstName,
            subject: email.subject,
            greeting: email.greeting,
            body: email.body,
            sign_off: email.sign_off,
            orderId: [...new Set(cust.products.map((p) => p.orderId))].join(", "),
            productTitle: cust.products.map((p) => p.productTitle).join(", "),
            estimatedDelivery: deliveryDate,
            supplierName,
            followupSubject: followUp?.subject ?? null,
            followupGreeting: followUp?.greeting ?? null,
            followupBody: followUp?.body ?? null,
            followupSignOff: followUp?.sign_off ?? null,
          });
          console.log(`[icelea-po/resend] sent to ${cust.email}`);
        }),
        3
      );

      console.log(`[icelea-po/resend] done`);
    });

    return NextResponse.json({ ok: true, queued: pairs.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
