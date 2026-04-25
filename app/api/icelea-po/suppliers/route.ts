import { NextResponse } from "next/server";
import { getAllKatanaSuppliers } from "@/lib/katana";

export async function GET() {
  try {
    const suppliers = await getAllKatanaSuppliers();
    return NextResponse.json({ suppliers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
