import { NextRequest, NextResponse } from "next/server";
import { getMappings, saveMapping } from "@/lib/wineur/mappings";
import type { MappingSource } from "@/lib/wineur/mappings";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") as MappingSource | null;
  if (!source || !["postfinance", "paypal"].includes(source))
    return NextResponse.json({ error: "source requis (postfinance|paypal)" }, { status: 400 });
  const mappings = await getMappings(source);
  return NextResponse.json({ mappings });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { source: MappingSource; key: string; compte: string }[];
  if (!Array.isArray(body) || body.length === 0)
    return NextResponse.json({ error: "Liste d'entrées attendue" }, { status: 400 });

  for (const { source, key, compte } of body) {
    if (!source || !key || !compte) continue;
    await saveMapping(source, key, compte);
  }
  return NextResponse.json({ saved: body.length });
}
