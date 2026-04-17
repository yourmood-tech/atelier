import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAllKatanaSuppliers } from "@/lib/katana";

export type SupplierLeadTime = {
  supplier_id: number;
  supplier_name: string;
  lead_time_days: number | null;
  updated_at: string | null;
};

// GET — all Katana suppliers merged with Supabase lead times
export async function GET() {
  try {
    const [katanaSuppliers, { data: rows, error }] = await Promise.all([
      getAllKatanaSuppliers(),
      supabaseAdmin.from("supplier_lead_times").select("supplier_id, lead_time_days, updated_at"),
    ]);

    if (error) throw new Error(error.message);

    const leadTimeMap = new Map<number, { lead_time_days: number | null; updated_at: string | null }>();
    for (const row of rows ?? []) {
      leadTimeMap.set(row.supplier_id, {
        lead_time_days: row.lead_time_days,
        updated_at: row.updated_at,
      });
    }

    const result: SupplierLeadTime[] = katanaSuppliers
      .filter((s) => s.name)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({
        supplier_id: s.id,
        supplier_name: s.name,
        lead_time_days: leadTimeMap.get(s.id)?.lead_time_days ?? null,
        updated_at: leadTimeMap.get(s.id)?.updated_at ?? null,
      }));

    return NextResponse.json({ ok: true, suppliers: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}

// POST — upsert lead time for a supplier
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      supplier_id: number;
      supplier_name: string;
      lead_time_days: number;
    };

    if (!body.supplier_id || typeof body.lead_time_days !== "number") {
      return NextResponse.json(
        { ok: false, error: "supplier_id et lead_time_days requis" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("supplier_lead_times").upsert(
      {
        supplier_id: body.supplier_id,
        supplier_name: body.supplier_name,
        lead_time_days: body.lead_time_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "supplier_id" }
    );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
