import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrderForVariants } from "@/lib/katana";
import { generateBackorderEmail, sendViaKlaviyo } from "@/lib/email";
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

    // 4. Fallback to lead time if no PO found
    if (!estimatedDelivery && materials.length) {
      const firstMaterialWithLeadTime = materials.find(
        (m) => typeof (m as unknown as Record<string, unknown>).lead_time === "number"
      );
      if (firstMaterialWithLeadTime) {
        leadTimeDays = (firstMaterialWithLeadTime as unknown as Record<string, unknown>)
          .lead_time as number;
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
