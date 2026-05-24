import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type QuizPayload = {
  campaign_slug?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  consent_rules?: boolean;
  consent_marketing?: boolean;
  source?: string;
  page_url?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuizPayload;

    if (!body.campaign_slug || !body.email) {
      return NextResponse.json(
        { ok: false, error: "campaign_slug et email requis" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const row: Record<string, unknown> = {
      campaign_slug: body.campaign_slug,
      firstname: body.firstname ?? null,
      lastname: body.lastname ?? null,
      email: body.email,
      consent_rules: body.consent_rules ?? null,
      consent_marketing: body.consent_marketing ?? null,
      source: body.source ?? null,
      page_url: body.page_url ?? null,
    };

    for (let i = 1; i <= 20; i++) {
      const key = `q${i}`;
      if (key in body) {
        row[key] = body[key] ?? null;
      }
    }

    const { error } = await supabaseAdmin.from("quiz_submissions").insert(row);

    if (error) {
      console.error("[quiz-submit] insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[quiz-submit] exception:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
