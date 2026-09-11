import { NextResponse } from "next/server";

// Inscription publique d'une cliente (e-mail donné à la fin du quizz starter pack)
// dans la liste Klaviyo dédiée. Public (exclu de l'auth dans middleware.ts).
const LIST_ID = "UPjwhy";
const KEY = process.env.KLAVIYO_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { email, pack } = await req.json();
    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "email invalide" }, { status: 400 });
    }

    const res = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
      {
        method: "POST",
        headers: {
          Authorization: `Klaviyo-API-Key ${KEY}`,
          "Content-Type": "application/json",
          accept: "application/json",
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              custom_source: "Quizz starter pack" + (pack ? ` — ${pack}` : ""),
              profiles: {
                data: [
                  {
                    type: "profile",
                    attributes: {
                      email,
                      subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
                    },
                  },
                ],
              },
            },
            relationships: { list: { data: { type: "list", id: LIST_ID } } },
          },
        }),
      }
    );

    if (res.status >= 200 && res.status < 300) {
      return NextResponse.json({ ok: true });
    }
    const t = await res.text();
    console.error("[quiz-lead] klaviyo", res.status, t.slice(0, 300));
    return NextResponse.json({ ok: false }, { status: 502 });
  } catch (e) {
    console.error("[quiz-lead] exception:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
