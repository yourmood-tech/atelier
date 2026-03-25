import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendStockMovementToKatana } from "@/lib/katana";
import type { ScanApiResponse, ScanRequest } from "@/lib/types";

function badRequest(error: string) {
  return NextResponse.json<ScanApiResponse>({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScanRequest;

    const sku = String(body.sku ?? "").trim().toUpperCase();
    const direction = body.direction;
    const sessionId = body.sessionId ?? null;
    const deviceName = body.deviceName ?? null;
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const direction = body.direction;

    if (!sku) {
      return NextResponse.json(
        { ok: false, error: "SKU manquant" },
        { status: 400 }
      );
    }

    // 👉 AJOUT ICI
    if (sku.length < 3) {
      return NextResponse.json(
        { ok: false, error: "SKU invalide" },
        { status: 400 }
      );
    }

    if (direction !== "IN" && direction !== "OUT") {
     return NextResponse.json(
       { ok: false, error: "Direction invalide" },
       { status: 400 }
     );
    }
    if (!sku) {
      return badRequest("SKU manquant");
    }

    if (direction !== "IN" && direction !== "OUT") {
      return badRequest("Direction invalide");
    }

    const { data: insertedEvent, error: insertError } = await supabaseAdmin
      .from("scan_events")
      .insert({
        sku,
        direction,
        device_name: deviceName,
        session_id: sessionId,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !insertedEvent) {
      throw new Error(insertError?.message || "Impossible de créer le log du scan");
    }

    try {
      const katanaResponse = await sendStockMovementToKatana({
        sku,
        direction,
        quantity: 1,
      });

      const { error: updateSuccessError } = await supabaseAdmin
        .from("scan_events")
        .update({
          status: "success",
          katana_response: katanaResponse,
        })
        .eq("id", insertedEvent.id);

      if (updateSuccessError) {
        throw new Error(updateSuccessError.message);
      }

      if (sessionId) {
        const { data: existingCounter } = await supabaseAdmin
          .from("scan_session_counters")
          .select("qty")
          .eq("session_id", sessionId)
          .eq("sku", sku)
          .maybeSingle();

        if (existingCounter) {
          await supabaseAdmin
            .from("scan_session_counters")
            .update({ qty: existingCounter.qty + 1 })
            .eq("session_id", sessionId)
            .eq("sku", sku);
        } else {
          await supabaseAdmin
            .from("scan_session_counters")
            .insert({
              session_id: sessionId,
              sku,
              qty: 1,
            });
        }
      }

      return NextResponse.json<ScanApiResponse>({
        ok: true,
        sku,
        direction,
        eventId: insertedEvent.id,
      });
    } catch (katanaError) {
      const message =
        katanaError instanceof Error ? katanaError.message : "Erreur Katana";

      await supabaseAdmin
        .from("scan_events")
        .update({
          status: "error",
          error_message: message,
        })
        .eq("id", insertedEvent.id);

      return NextResponse.json<ScanApiResponse>(
        {
          ok: false,
          error: message,
          eventId: insertedEvent.id,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json<ScanApiResponse>(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}
