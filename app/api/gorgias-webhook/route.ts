import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { detectDelayInquiry, generateGorgiasResponse, getKlaviyoProfileLocale } from "@/lib/email";
import { postInternalNote } from "@/lib/gorgias";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TARGET_GROUP = "Demande de Délais (Groupe)";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    const eventType = (body?.event as Record<string, unknown>)?.type as string | undefined;
    const data = (body?.event as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const ticket = data?.ticket as Record<string, unknown> | undefined;
    const message = data?.message as Record<string, unknown> | undefined;

    // Only handle new messages from customers
    if (eventType !== "ticket-message-created" || !ticket || !message) {
      return NextResponse.json({ ok: true, skipped: "not a customer message event" });
    }

    if (message.from_agent === true) {
      return NextResponse.json({ ok: true, skipped: "agent message" });
    }

    // Only process tickets assigned to the target group
    const teamName =
      (ticket.assignee_team as Record<string, unknown> | null)?.name ??
      (ticket.team as Record<string, unknown> | null)?.name ?? "";

    if (teamName !== TARGET_GROUP) {
      return NextResponse.json({ ok: true, skipped: `wrong group: ${teamName}` });
    }

    const ticketId = ticket.id as number;
    const messageText = (message.body_text as string) ?? "";

    if (!messageText.trim() || !ticketId) {
      return NextResponse.json({ ok: true, skipped: "empty message" });
    }

    // 1. Detect if this is a delay inquiry and extract order number
    const detection = await detectDelayInquiry(messageText);

    if (!detection.is_delay_inquiry || !detection.order_number) {
      return NextResponse.json({ ok: true, skipped: "not a delay inquiry" });
    }

    // 2. Fetch order from Shopify
    let order;
    try {
      order = await getOrderById(detection.order_number);
    } catch {
      await postInternalNote(
        ticketId,
        `🤖 AI Draft — À valider avant envoi\n\nCommande ${detection.order_number} introuvable dans Shopify. Vérifier le numéro de commande manuellement.`
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Override locale from Klaviyo
    const klaviyoLocale = await getKlaviyoProfileLocale(order.customer.email);
    if (klaviyoLocale) order.customer.locale = klaviyoLocale;

    // 4. Check backorder status for each product in the order
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
              if (po) estimatedDelivery = po.estimatedDelivery;

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
            // Non-blocking — product without Katana recipe
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

    // 5. Generate draft response
    const draftText = await generateGorgiasResponse({
      orderName: order.name,
      customerFirstName: order.customer.firstName,
      customerMessage: messageText,
      backorderItems,
    });

    // 6. Post as internal note with header
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gorgias webhook error:", error);
    // Always return 200 — Gorgias retries on non-2xx
    return NextResponse.json({ ok: true });
  }
}
