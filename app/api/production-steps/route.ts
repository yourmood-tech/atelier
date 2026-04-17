import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ProductionStep } from "@/lib/types";

// GET — all production steps with current time estimates
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("production_steps")
      .select("*")
      .order("sort_order");

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, steps: (data ?? []) as ProductionStep[] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}

// POST — update time estimates for a step
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: number;
      lead_time_min: number;
      lead_time_max: number | null;
      lead_time_unit: "hours" | "days";
    };

    if (!body.id || typeof body.lead_time_min !== "number") {
      return NextResponse.json(
        { ok: false, error: "id et lead_time_min requis" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("production_steps")
      .update({
        lead_time_min: body.lead_time_min,
        lead_time_max: body.lead_time_max ?? null,
        lead_time_unit: body.lead_time_unit ?? "hours",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
