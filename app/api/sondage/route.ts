import { NextRequest, NextResponse } from "next/server";
import { QUESTIONS } from "@/app/sondage/questions";

// Code de réduction Shopify créé par Amila — le même pour toutes les clientes.
// Anti-fraude : "1 utilisation par client" est géré par Shopify.
const SHOPIFY_CODE = "MERCIAVOUS20";

function labelFor(qid: string, value: string): string {
  const q = QUESTIONS.find((q) => q.id === qid);
  if (!q?.options) return value;
  const opt = q.options.find((o) => o.value === value);
  return opt?.label || value;
}

function buildRow(
  reponses: Record<string, unknown>,
  bonCode: string,
  prenom: string,
  email: string,
): string[] {
  const now = new Date();
  // Date FR ISO local Zurich
  const dateStr = now.toLocaleString("fr-CH", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const row: string[] = [dateStr, prenom, email, bonCode];

  for (const q of QUESTIONS) {
    if (q.type === "contact") continue;
    const v = reponses[q.id];
    if (q.type === "single" && typeof v === "string") {
      row.push(labelFor(q.id, v));
    } else if (q.type === "multi" && Array.isArray(v)) {
      row.push(v.map((x) => labelFor(q.id, String(x))).join(" · "));
    } else if ((q.type === "text" || q.type === "longtext") && typeof v === "string") {
      row.push(v);
    } else if (q.type === "slider" && typeof v === "number") {
      const unit = q.sliderUnit ? ` ${q.sliderUnit}` : "";
      row.push(`${v}${unit}`);
    } else if (q.type === "gauge" && typeof v === "number") {
      row.push(`${v}%`);
    } else if (q.type === "rating" && typeof v === "number") {
      row.push(`${v}/${q.ratingMax ?? 5} étoiles`);
    } else if (q.type === "rank" && Array.isArray(v)) {
      const topN = q.rankTopN ?? 3;
      const podium = v.slice(0, topN).map((x, i) => `${i + 1}. ${labelFor(q.id, String(x))}`).join(" · ");
      row.push(podium);
    } else {
      row.push("");
    }
  }

  return row;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { reponses: Record<string, unknown> };

    if (!body.reponses || typeof body.reponses !== "object") {
      return NextResponse.json({ ok: false, error: "Réponses manquantes" }, { status: 400 });
    }

    const contact = body.reponses.contact as { prenom?: string; email?: string } | undefined;
    if (!contact?.email || !/\S+@\S+\.\S+/.test(contact.email)) {
      return NextResponse.json({ ok: false, error: "Email manquant ou invalide" }, { status: 400 });
    }

    const email = contact.email.toLowerCase().trim();
    const prenom = contact.prenom?.trim() || "";
    const bonCode = SHOPIFY_CODE;
    const row = buildRow(body.reponses, bonCode, prenom, email);

    // Webhook Google Apps Script — Sheet "Sondage Mood — Réponses" d'Amila
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
      || "https://script.google.com/macros/s/AKfycbw062yGNVkwL2mSm5WtinJrx4nqu5pxvA5HAGLcdEQ25T4cY87adV74RgmDVCP4Dxw83g/exec";

    const sheetHeaders = [
      "Date",
      "Prénom",
      "Email",
      "Code bon",
      ...QUESTIONS.filter((q) => q.type !== "contact").map((q) => q.question),
    ];

    const sheetRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, row, code: bonCode, headers: sheetHeaders }),
      redirect: "follow",
    });

    const sheetData = await sheetRes.json().catch(() => ({ ok: false }));

    if (!sheetRes.ok || !sheetData?.ok) {
      console.error("Apps Script error:", sheetData);
      // On retourne quand même un code — meilleur UX que erreur
      return NextResponse.json({ ok: true, bon_code: bonCode });
    }

    // Si email déjà connu → Apps Script renvoie le code existant
    const finalCode = sheetData.bon_code || bonCode;

    return NextResponse.json({
      ok: true,
      bon_code: finalCode,
      existing: !!sheetData.existing,
    });
  } catch (e) {
    console.error("POST /api/sondage error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
