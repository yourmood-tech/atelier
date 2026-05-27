import { NextRequest, NextResponse } from "next/server";

const SUPA_URL = process.env.MOODLOVERS_SUPA_URL!;
const SUPA_KEY = process.env.MOODLOVERS_SUPA_SERVICE_KEY!;
const SLACK_WEBHOOK = process.env.SLACK_MOODLOVERS_WEBHOOK;
const ADMIN_URL = "https://mood-quizz-analytics.vercel.app/app/mood-lovers";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const name = (form.get("name") as string | null)?.trim();
    const city = (form.get("city") as string | null)?.trim();
    const description = (form.get("description") as string | null)?.trim() || null;
    const instagram = (form.get("instagram") as string | null)?.trim() || null;
    const image = form.get("image") as File | null;

    if (!name || !city || !image) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400, headers: CORS });
    }

    // 1. Upload image to Supabase Storage
    const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const storageRes = await fetch(`${SUPA_URL}/storage/v1/object/compo-images/${filename}`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": image.type || "image/jpeg",
      },
      body: await image.arrayBuffer(),
    });

    if (!storageRes.ok) {
      const err = await storageRes.text();
      return NextResponse.json({ error: `Upload échoué: ${err}` }, { status: 500, headers: CORS });
    }

    const imageUrl = `${SUPA_URL}/storage/v1/object/public/compo-images/${filename}`;

    // 2. Insert compo row
    const insertRes = await fetch(`${SUPA_URL}/rest/v1/compos`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ name, city, description, instagram, image_url: imageUrl, approved: false }),
      cache: "no-store",
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return NextResponse.json({ error: `Enregistrement échoué: ${err}` }, { status: 500, headers: CORS });
    }

    // 3. Slack notification
    if (SLACK_WEBHOOK) {
      const descText = description ? `\n_"${description}"_` : "";
      const igText = instagram ? `\n${instagram}` : "";

      const slackBody = {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🫶 Nouvelle compo soumise !" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${name}* · 📍 ${city}${descText}${igText}`,
            },
            accessory: {
              type: "image",
              image_url: imageUrl,
              alt_text: `Compo de ${name}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "✓ Valider dans Shopify" },
                style: "primary",
                url: ADMIN_URL,
              },
            ],
          },
        ],
      };

      await fetch(SLACK_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackBody),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, imageUrl }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: CORS });
  }
}
