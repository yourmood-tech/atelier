import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId, addOrderTag, makeOrderTag } from "@/lib/shopify";
import { generateProductionEmail, sendProductionEventToKlaviyo } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ProductionNotifyApiResponse, ProductionAnalysis, ProductionDirection, ProductionStep } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      order_id: string;
      product_id: string;
      step_key: string;
      direction: ProductionDirection;
    };

    if (!body.order_id || !body.product_id || !body.step_key || !body.direction) {
      return NextResponse.json<ProductionNotifyApiResponse>(
        { ok: false, error: "order_id, product_id, step_key et direction requis" },
        { status: 400 }
      );
    }

    // 1. Fetch Shopify order + product + production step in parallel
    const [order, product, stepResult] = await Promise.all([
      getOrderById(body.order_id),
      lookupShopifyId(body.product_id),
      supabaseAdmin
        .from("production_steps")
        .select("*")
        .eq("step_key", body.step_key)
        .single(),
    ]);

    if (stepResult.error || !stepResult.data) {
      throw new Error(`Étape de production introuvable: ${body.step_key}`);
    }

    const step = stepResult.data as ProductionStep;

    // 2. Generate email
    const analysis: ProductionAnalysis = {
      order,
      product,
      step,
      direction: body.direction,
      emailDraft: null,
    };

    const { subject, emailBody } = await generateProductionEmail(analysis);
    analysis.emailDraft = `Subject: ${subject}\n\n${emailBody}`;

    // 3. Send via Klaviyo
    await sendProductionEventToKlaviyo({
      email: order.customer.email,
      firstName: order.customer.firstName,
      subject,
      body: emailBody,
      orderId: order.name,
      productTitle: product.productTitle,
      stepName: step.name,
      direction: body.direction,
      leadTimeMin: step.lead_time_min,
      leadTimeMax: step.lead_time_max,
      leadTimeUnit: step.lead_time_unit,
      customerLocale: order.customer.locale,
    });

    const tagReason = body.direction === "IN"
      ? `${step.name} Entrée`
      : `${step.name} Sortie`;
    void addOrderTag(order.id, makeOrderTag(tagReason)).catch(console.error);

    return NextResponse.json<ProductionNotifyApiResponse>({ ok: true, result: analysis });
  } catch (error) {
    return NextResponse.json<ProductionNotifyApiResponse>(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
