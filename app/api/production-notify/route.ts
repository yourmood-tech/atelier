import { NextRequest, NextResponse } from "next/server";
import { getOrderById, lookupShopifyId, addOrderTag, makeOrderTag } from "@/lib/shopify";
import { generateProductionEmail, sendProductionEventToKlaviyo } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ProductionNotifyApiResponse, ProductionAnalysis, ProductionDirection, ProductionStep } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      order_id: string;
      product_id?: string;
      step_key: string;
      direction: ProductionDirection;
    };

    if (!body.order_id || !body.step_key || !body.direction) {
      return NextResponse.json<ProductionNotifyApiResponse>(
        { ok: false, error: "order_id, step_key et direction requis" },
        { status: 400 }
      );
    }

    // 1. Fetch order + step (+ product if provided) in parallel
    const [order, stepResult, productResult] = await Promise.all([
      getOrderById(body.order_id),
      supabaseAdmin.from("production_steps").select("*").eq("step_key", body.step_key).single(),
      body.product_id ? lookupShopifyId(body.product_id) : Promise.resolve(null),
    ]);

    if (stepResult.error || !stepResult.data) {
      throw new Error(`Étape de production introuvable: ${body.step_key}`);
    }

    const step = stepResult.data as ProductionStep;
    const tagReason = `${step.step_key}-${body.direction === "IN" ? "in" : "out"}`;

    // 2. Tag the order in all cases (awaited — fire-and-forget gets killed by Vercel before completing)
    await addOrderTag(order.id, makeOrderTag(tagReason));

    const analysis: ProductionAnalysis = {
      order,
      product: productResult ?? undefined,
      step,
      direction: body.direction,
      emailDraft: null,
    };

    // 3. Klaviyo — only if send_klaviyo is enabled for this step
    if (step.send_klaviyo) {

      const { subject, greeting, body: emailBody, sign_off } = await generateProductionEmail(analysis);
      analysis.emailDraft = `Subject: ${subject}\n\n${greeting}\n\n${emailBody}\n\n${sign_off}`;

      await sendProductionEventToKlaviyo({
        email: order.customer.email,
        firstName: order.customer.firstName,
        subject,
        greeting,
        body: emailBody,
        sign_off,
        orderId: order.name,
        productTitle: productResult?.productTitle ?? "",
        stepName: step.name,
        direction: body.direction,
        leadTimeMin: step.lead_time_min,
        leadTimeMax: step.lead_time_max,
        leadTimeUnit: step.lead_time_unit,
        customerLocale: order.customer.locale,
      });
    }

    return NextResponse.json<ProductionNotifyApiResponse>({ ok: true, result: analysis });
  } catch (error) {
    return NextResponse.json<ProductionNotifyApiResponse>(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
