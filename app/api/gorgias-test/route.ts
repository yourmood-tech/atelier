import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { detectDelayInquiry, generateGorgiasResponse, getKlaviyoProfileLocale } from "@/lib/email";
import { getTicketLastCustomerMessage, postInternalNote } from "@/lib/gorgias";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/gorgias-test?ticket_id=12345
// Manually runs the delay-inquiry analysis on an existing Gorgias ticket.
export async function GET(req: NextRequest) {
  try {
  const ticketIdStr = req.nextUrl.searchParams.get("ticket_id")?.trim() ?? "";
  const ticketId = Number(ticketIdStr);

  if (!ticketId) {
    return NextResponse.json({ ok: false, error: "ticket_id requis" }, { status: 400 });
  }

  // 1. Fetch last customer message from Gorgias
  const msg = await getTicketLastCustomerMessage(ticketId);
  if (!msg?.text) {
    return NextResponse.json({ ok: false, error: "Aucun message client trouvé dans ce ticket" });
  }

  // 2. Detect delay inquiry + order number
  const detection = await detectDelayInquiry(msg.text);
  if (!detection.is_delay_inquiry || !detection.order_number) {
    return NextResponse.json({
      ok: false,
      error: "Pas une demande de délai, ou numéro de commande introuvable dans le message",
      detection,
      message_preview: msg.text.slice(0, 200),
    });
  }

  // 3. Fetch Shopify order
  let order;
  try {
    order = await getOrderById(detection.order_number);
  } catch (e) {
    await postInternalNote(
      ticketId,
      `🤖 AI Draft — À valider avant envoi\n\nCommande ${detection.order_number} introuvable dans Shopify. Vérifier le numéro manuellement.`
    );
    return NextResponse.json({ ok: false, error: `Commande introuvable: ${detection.order_number}` });
  }

  // 4. Override locale from Klaviyo
  const klaviyoLocale = await getKlaviyoProfileLocale(order.customer.email);
  if (klaviyoLocale) order.customer.locale = klaviyoLocale;

  // 5. Backorder analysis per product
  const backorderItems = (
    await Promise.all(
      order.lineItems.map(async (li) => {
        let estimatedDelivery: string | null = null;
        let leadTimeMin: number | null = null;
        let leadTimeMax: number | null = null;

        try {
          const recipe = await getRecipeWithSuppliers(li.sku);
          const materials = recipe?.ingredients ?? [];

          if (materials.length) {
            const variantIds = materials.map((m) => m.id);
            const po = await getOpenPurchaseOrderForVariants(variantIds);
            if (po?.estimatedDelivery && new Date(po.estimatedDelivery) > new Date()) {
              estimatedDelivery = po.estimatedDelivery;
            }

            if (!estimatedDelivery) {
              const supplierIds = materials
                .filter((m) => m.supplier !== null)
                .map((m) => m.supplier!.id);
              if (supplierIds.length) {
                const { data: ltRows } = await supabaseAdmin
                  .from("supplier_lead_times")
                  .select("lead_time_min, lead_time_max")
                  .in("supplier_id", supplierIds)
                  .not("lead_time_min", "is", null)
                  .limit(1);
                if (ltRows?.[0]) {
                  leadTimeMin = ltRows[0].lead_time_min as number;
                  leadTimeMax = ltRows[0].lead_time_max as number | null;
                }
              }
            }
          }
        } catch {
          // product without Katana recipe
        }

        return {
          productTitle: li.title,
          estimatedDelivery,
          leadTimeMin,
          leadTimeMax,
          isBackorder: !!(estimatedDelivery || leadTimeMin),
        };
      })
    )
  ).filter((i) => i.isBackorder);

  // 6. Generate draft
  const draftText = await generateGorgiasResponse({
    orderName: order.name,
    customerFirstName: order.customer.firstName,
    customerMessage: msg.text,
    backorderItems,
  });

  // 7. Post internal note
  const noteLines = [
    "🤖 AI Draft — À valider avant envoi",
    "",
    draftText,
    "",
    "---",
    `Commande: ${order.name} | Client: ${order.customer.firstName} ${order.customer.lastName}`,
    backorderItems.length
      ? `Produits en attente: ${backorderItems.map((i) => i.productTitle).join(", ")}`
      : "Aucun retard détecté — commande en cours normale.",
  ];
  await postInternalNote(ticketId, noteLines.join("\n"));

  return NextResponse.json({
    ok: true,
    ticket_id: ticketId,
    order: order.name,
    locale: order.customer.locale,
    backorder_items: backorderItems.length,
    draft_preview: draftText.slice(0, 300),
  });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
