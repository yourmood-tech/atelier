import { NextResponse } from "next/server";
import { getAuthorizeUrl } from "@/lib/produits/dash";

export async function GET(request: Request) {
  try {
    const host = request.headers.get("host");
    const url = getAuthorizeUrl(host);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json(
      { error: String((e as Error)?.message || e) },
      { status: 500 }
    );
  }
}
