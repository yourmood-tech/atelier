import { NextResponse } from "next/server";
import { getGeminiStats } from "@/lib/gemini-counter";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getGeminiStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
