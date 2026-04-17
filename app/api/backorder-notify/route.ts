import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId } from "@/lib/shopify";
import { getRecipeWithSuppliers, getOpenPurchaseOrdersForSupplier } from "@/lib/katana";
import { generateBackorderEmail, sendEmail } from "@/lib/email";
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

    // 3. Find open PO for any supplier of this product's materials
    let purchaseOrder = null;
    let estimatedDelivery: string | null = null;
    let leadTimeDays: number | null = null;

    const suppliersWithMaterials = materials
      .filter((m) => m.supplier !== null)
      .reduce<Map<number, number[]>>((acc, m) => {
        const sid = m.supplier!.id;
        if (!acc.has(sid)) acc.set(sid, []);
        acc.get(sid)!.push(m.id);
        return acc;
      }, new Map());

    for (const [supplierId, variantIds] of suppliersWithMaterials) {
      const po = await getOpenPurchaseOrdersForSupplier(supplierId, variantIds);
      if (po) {
        purchaseOrder = po;
        estimatedDelivery = po.estimatedDelivery;
        break;
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
      subject: string;
      body: string;
    };

    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json(
        { ok: false, error: "Champs to, subject et body requis" },
        { status: 400 }
      );
    }

    await sendEmail({ to: body.to, subject: body.subject, body: body.body });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur envoi" },
      { status: 500 }
    );
  }
}
