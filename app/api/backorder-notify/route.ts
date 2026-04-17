import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { generateBackorderEmail, sendViaKlaviyo } from "@/lib/email";
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

    // 2. Get recipe + materials + suppliers
    const recipe = product.sku ? await getRecipeWithSuppliers(product.sku) : null;
    const materials = recipe?.ingredients ?? [];

    // 3. Find open PO — search directly by ingredient variant ID across all open POs.
    //    This works even when materials have no default_supplier_id set in Katana.
    let purchaseOrder = null;
    let estimatedDelivery: string | null = null;
    let leadTimeDays: number | null = null;

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
          .select("lead_time_days")
          .in("supplier_id", supplierIds)
          .not("lead_time_days", "is", null)
          .order("lead_time_days", { ascending: false })
          .limit(1);

        if (ltRows?.[0]?.lead_time_days) {
          leadTimeDays = ltRows[0].lead_time_days as number;
        }
      }
    }

    // 5. Generate email draft
    const analysis: BackorderAnalysis = {
      order,
      product,
      materials,
      purchaseOrder,
      estimatedDelivery,
      leadTimeDays,
      emailDraft: null,
    };

    const { subject, body } = await generateBackorderEmail(analysis);
    analysis.emailDraft = `Subject: ${subject}\n\n${body}`;

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
      productTitle?: string;
      estimatedDelivery?: string | null;
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
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur envoi" },
      { status: 500 }
    );
  }
}
