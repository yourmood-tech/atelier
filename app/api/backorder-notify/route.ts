import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyBySku, addOrderTag, makeOrderTag } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { generateBackorderEmail, generateFollowUpEmail, sendViaKlaviyo } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BackorderApiResponse, BackorderAnalysis } from "@/lib/types";

// GET — analyse the backorder situation (order + product → ETA + email draft)
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("order_id")?.trim() ?? "";
    const variantSku = req.nextUrl.searchParams.get("variant_sku")?.trim() ?? "";

    if (!orderId || !variantSku) {
      return NextResponse.json<BackorderApiResponse>(
        { ok: false, error: "Paramètres order_id et variant_sku requis" },
        { status: 400 }
      );
    }

    // 1. Fetch Shopify order + product in parallel
    const [order, product] = await Promise.all([
      getOrderById(orderId),
      lookupShopifyBySku(variantSku),
    ]);

    // 2. Get recipe + materials + suppliers
    const recipe = product.sku ? await getRecipeWithSuppliers(product.sku) : null;
    const materials = recipe?.ingredients ?? [];

    // 3. Find open PO — search directly by ingredient variant ID across all open POs.
    //    This works even when materials have no default_supplier_id set in Katana.
    let purchaseOrder = null;
    let estimatedDelivery: string | null = null;
    let leadTimeMin: number | null = null;
    let leadTimeMax: number | null = null;

    if (materials.length) {
      const allVariantIds = materials.map((m) => m.id);
      purchaseOrder = await getOpenPurchaseOrderForVariants(allVariantIds);
      if (purchaseOrder) {
        estimatedDelivery = purchaseOrder.estimatedDelivery;
      }
    }

    // 4. Fallback to default supplier lead time from Supabase
    if (!estimatedDelivery && materials.length) {
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

    // 5. Determine if a follow-up is needed (lead time > 12 days)
    const needsFollowUp = estimatedDelivery
      ? Math.ceil((new Date(estimatedDelivery).getTime() - Date.now()) / 86_400_000) > 12
      : (leadTimeMin ?? 0) > 12;

    // 6. Generate email drafts (initial + optional follow-up) in parallel
    const analysis: BackorderAnalysis = {
      order,
      product,
      materials,
      purchaseOrder,
      estimatedDelivery,
      leadTimeMin,
      leadTimeMax,
      emailDraft: null,
      followUpEmailDraft: null,
    };

    const [initial, followUp] = await Promise.all([
      generateBackorderEmail(analysis),
      needsFollowUp ? generateFollowUpEmail(analysis) : Promise.resolve(null),
    ]);

    analysis.emailDraft = `Subject: ${initial.subject}\n\n${initial.body}`;
    if (followUp) {
      analysis.followUpEmailDraft = `Subject: ${followUp.subject}\n\n${followUp.body}`;
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
      subject: string;
      body: string;
      orderId?: string;
      orderNumericId?: number;
      productTitle?: string;
      estimatedDelivery?: string | null;
      supplierName?: string | null;
      followupSubject?: string | null;
      followupBody?: string | null;
    };

    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json(
        { ok: false, error: "Champs to, subject et body requis" },
        { status: 400 }
      );
    }

    await sendViaKlaviyo({
      email: body.to,
      firstName: body.firstName ?? "",
      subject: body.subject,
      body: body.body,
      orderId: body.orderId ?? "",
      productTitle: body.productTitle ?? "",
      estimatedDelivery: body.estimatedDelivery ?? null,
      supplierName: body.supplierName ?? null,
      followupSubject: body.followupSubject ?? null,
      followupBody: body.followupBody ?? null,
    });

    if (body.orderNumericId) {
      const tagReason = body.supplierName ? `Rupture ${body.supplierName}` : "Rupture";
      void addOrderTag(body.orderNumericId, makeOrderTag(tagReason)).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur envoi" },
      { status: 500 }
    );
  }
}
