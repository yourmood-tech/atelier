import { NextRequest, NextResponse } from "next/server";

const FAL_KEY = process.env.FAL_KEY;
const MODEL = "fal-ai/kling-video/v2.1/standard/image-to-video";

export const maxDuration = 60;

const MOTION_PROMPT = `A slow, smooth, steady cinematic CAMERA ORBIT 360 degrees around the stationary ring. The ring stays perfectly still in the center of the frame, never moves, never rotates on itself, never changes shape, color, material, finish, or gemstones. Only the camera moves slowly around it on a perfect circular path at constant speed and constant distance. Soft neutral studio lighting that turns gently with the camera. Neutral plain background. Cinematic luxury jewelry product turntable shot, like a Cartier or Tiffany e-commerce video. The ring is the absolute hero, preserved exactly as in the source image, no morphing, no deformation, no detail invention, no extra elements added.`;

export async function POST(req: NextRequest) {
  if (!FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY manquante dans les variables d'environnement Vercel. Crée un compte sur fal.ai, recharge du crédit, ajoute la clé." },
      { status: 500 }
    );
  }

  let body: { image?: string; duration?: string; aspectRatio?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { image, duration = "5", aspectRatio = "1:1", note } = body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante ou invalide (attendu : data:image/...;base64,...)" }, { status: 400 });
  }

  const prompt = note && note.trim()
    ? `${MOTION_PROMPT}\n\nADDITIONAL USER INSTRUCTIONS (priority override): ${note.trim()}`
    : MOTION_PROMPT;

  try {
    const r = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_url: image,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: "blurred ring, distorted ring, melting, morphing, changing shape, changing color, changing material, extra fingers, extra gemstones, missing gemstones, deformed jewelry, abstract patterns, text, watermark, logo",
      }),
    });

    const text = await r.text();
    let data: { request_id?: string; status_url?: string; response_url?: string; error?: string; detail?: unknown };
    try { data = JSON.parse(text); }
    catch { return NextResponse.json({ error: `Réponse fal.ai non-JSON (HTTP ${r.status}): ${text.slice(0, 200)}` }, { status: 502 }); }

    if (!r.ok) {
      const msg = data?.error || (typeof data?.detail === "string" ? data.detail : JSON.stringify(data?.detail || data).slice(0, 300));
      return NextResponse.json({ error: `fal.ai ${r.status}: ${msg}` }, { status: 502 });
    }

    if (!data.request_id) {
      return NextResponse.json({ error: "Pas de request_id dans la réponse fal.ai" }, { status: 502 });
    }

    return NextResponse.json({ requestId: data.request_id });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY manquante" }, { status: 500 });
  }
  const requestId = req.nextUrl.searchParams.get("id");
  if (!requestId) {
    return NextResponse.json({ error: "Paramètre 'id' manquant" }, { status: 400 });
  }

  try {
    const statusR = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}/status`, {
      headers: { "Authorization": `Key ${FAL_KEY}` },
    });
    const statusText = await statusR.text();
    let statusData: { status?: string; queue_position?: number; logs?: unknown[]; error?: string };
    try { statusData = JSON.parse(statusText); }
    catch { return NextResponse.json({ error: `Status non-JSON: ${statusText.slice(0, 200)}` }, { status: 502 }); }

    if (!statusR.ok) {
      return NextResponse.json({ error: `fal.ai status ${statusR.status}: ${statusData?.error || statusText.slice(0, 200)}` }, { status: 502 });
    }

    const status = statusData?.status || "UNKNOWN";

    if (status === "COMPLETED") {
      const respR = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}`, {
        headers: { "Authorization": `Key ${FAL_KEY}` },
      });
      const respText = await respR.text();
      let respData: { video?: { url?: string }; error?: string };
      try { respData = JSON.parse(respText); }
      catch { return NextResponse.json({ error: `Response non-JSON: ${respText.slice(0, 200)}` }, { status: 502 }); }

      if (!respR.ok) {
        return NextResponse.json({ error: `fal.ai response ${respR.status}: ${respData?.error || respText.slice(0, 200)}` }, { status: 502 });
      }
      const videoUrl = respData?.video?.url;
      if (!videoUrl) {
        return NextResponse.json({ status: "COMPLETED", error: "Pas d'URL vidéo dans la réponse fal.ai" });
      }
      return NextResponse.json({ status: "COMPLETED", videoUrl });
    }

    if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
      return NextResponse.json({ status, queuePosition: statusData?.queue_position ?? null });
    }

    if (status === "FAILED" || status === "ERROR") {
      return NextResponse.json({ status, error: statusData?.error || "Génération échouée côté fal.ai" });
    }

    return NextResponse.json({ status });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
