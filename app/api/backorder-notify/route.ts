import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId, addOrderTag, makeOrderTag } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { generateBackorderEmail, generateFollowUpEmail, sendViaKlaviyo, getKlaviyoProfileLocale } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BackorderApiResponse, BackorderAnalysis } from "@/lib/types";

// GET — analyse the backorder situation (order + product → ETA + email draft)
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("order_id")?.trim() ?? "";
    const productId = req.nextUrl.searchParams.get("product_id")?.trim() ?? "";

    if (!orderId || !productId) {
      return NextResponse.json<BackorderApiResponse>(
        { ok: false, error: "Paramètres order_id et product_id requis" },
        { status: 400 }
      );
    }

    // 1. Fetch Shopify order + product in parallel
    const [order, product] = await Promise.all([
      getOrderById(orderId),
      lookupShopifyId(productId),
    ]);

    // 2. Override locale from Klaviyo — more reliable than Shopify REST for multilingual customers
    const klaviyoLocale = await getKlaviyoProfileLocale(order.customer.email);
    if (klaviyoLocale) order.customer.locale = klaviyoLocale;

    // 3. Extract actual ordered variant SKU from the order's line items
    const lineItem = order.lineItems.find((li) => String(li.productId) === productId);
    const variantSku = lineItem?.sku ?? product.sku;

    // 3. Get recipe + materials + suppliers
    const recipe = variantSku ? await getRecipeWithSuppliers(variantSku) : null;
    const materials = recipe?.ingredients ?? [];

    // 4. No ingredients found — tag only, no email
    if (!materials.length) {
      const analysis: BackorderAnalysis = {
        order,
        product,
        materials: [],
        purchaseOrder: null,
        estimatedDelivery: null,
        leadTimeMin: null,
        leadTimeMax: null,
        tagOnly: true,
        emailDraft: null,
        followUpEmailDraft: null,
      };
      return NextResponse.json<BackorderApiResponse>({ ok: true, result: analysis });
    }

    // 5. Find open PO created after the customer's order — prefer earliest delivery date
    let purchaseOrder = null;
    let estimatedDelivery: string | null = null;
    let leadTimeMin: number | null = null;
    let leadTimeMax: number | null = null;

    const allVariantIds = materials.map((m) => m.id);
    purchaseOrder = await getOpenPurchaseOrderForVariants(allVariantIds, order.createdAt);
    if (purchaseOrder?.estimatedDelivery && new Date(purchaseOrder.estimatedDelivery) > new Date()) {
      estimatedDelivery = purchaseOrder.estimatedDelivery;
    }

    // 6. Fallback to default supplier lead time from Supabase
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
          .order("lead_time_max", { ascending: false, nullsFirst: false })
          .limit(1);

        if (ltRows?.[0]) {
          leadTimeMin = ltRows[0].lead_time_min as number | null;
          leadTimeMax = ltRows[0].lead_time_max as number | null;
        }
      }
    }

    // 7. Determine if a follow-up is needed (lead time > 12 days)
    const needsFollowUp = estimatedDelivery
      ? Math.ceil((new Date(estimatedDelivery).getTime() - Date.now()) / 86_400_000) > 12
      : (leadTimeMin ?? 0) > 12;

    // 8. Generate email drafts (initial + optional follow-up) in parallel
    const analysis: BackorderAnalysis = {
      order,
      product,
      materials,
      purchaseOrder,
      estimatedDelivery,
      leadTimeMin,
      leadTimeMax,
      tagOnly: false,
      emailDraft: null,
      followUpEmailDraft: null,
    };

    const [initial, followUp] = await Promise.all([
      generateBackorderEmail(analysis),
      needsFollowUp ? generateFollowUpEmail(analysis) : Promise.resolve(null),
    ]);

    analysis.emailDraft = { subject: initial.subject, greeting: initial.greeting, body: initial.body, sign_off: initial.sign_off };
    if (followUp) {
      analysis.followUpEmailDraft = { subject: followUp.subject, greeting: followUp.greeting, body: followUp.body, sign_off: followUp.sign_off };
    }

    return NextResponse.json<BackorderApiResponse>({ ok: true, result: analysis });
  } catch (error) {
    return NextResponse.json<BackorderApiResponse>(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST — actually send the email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      to: string;
      firstName?: string;
      tagOnly?: boolean;
      subject?: string;
      greeting?: string;
      body?: string;
      sign_off?: string;
      orderId?: string;
      orderNumericId?: number;
      productTitle?: string;
      estimatedDelivery?: string | null;
      supplierName?: string | null;
      followupSubject?: string | null;
      followupGreeting?: string | null;
      followupBody?: string | null;
      followupSignOff?: string | null;
    };

    if (!body.to) {
      return NextResponse.json(
        { ok: false, error: "Champ to requis" },
        { status: 400 }
      );
    }

    if (!body.tagOnly && body.subject && body.body) {
      await sendViaKlaviyo({
        email: body.to,
        firstName: body.firstName ?? "",
        subject: body.subject,
        greeting: body.greeting ?? "",
        body: body.body,
        sign_off: body.sign_off ?? "",
        orderId: body.orderId ?? "",
        productTitle: body.productTitle ?? "",
        estimatedDelivery: body.estimatedDelivery ?? null,
        supplierName: body.supplierName ?? null,
        followupSubject: body.followupSubject ?? null,
        followupGreeting: body.followupGreeting ?? null,
        followupBody: body.followupBody ?? null,
        followupSignOff: body.followupSignOff ?? null,
      });
    }

    if (body.orderNumericId) {
      const tagReason = body.supplierName ? `Rupture ${body.supplierName}` : "Rupture";
      await addOrderTag(body.orderNumericId, makeOrderTag(tagReason));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur envoi" },
      { status: 500 }
    );
  }
}
