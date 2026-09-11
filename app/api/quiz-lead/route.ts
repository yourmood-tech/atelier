import { NextResponse } from "next/server";

// Inscription publique d'une cliente (e-mail donné à la fin du quizz starter pack)
// dans la liste Klaviyo dédiée. Public (exclu de l'auth dans middleware.ts).
// Méthode fiable : on crée/retrouve le profil, on l'ajoute tout de suite à la liste,
// puis on pose le consentement marketing (best-effort).
const LIST_ID = "UPjwhy";
const KEY = process.env.KLAVIYO_API_KEY || "";

function kfetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      Authorization: `Klaviyo-API-Key ${KEY}`,
      accept: "application/json",
      "Content-Type": "application/json",
      revision: "2024-10-15",
      ...(opts.headers || {}),
    },
  });
}

export async function POST(req: Request) {
  try {
    const { email, pack } = await req.json();
    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "email invalide" }, { status: 400 });
    }

    // 1) créer le profil (ou récupérer l'id s'il existe déjà)
    let id: string | null = null;
    const create = await kfetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            properties: pack ? { QuizStarterPack: pack } : undefined,
          },
        },
      }),
    });
    if (create.status === 201) {
      id = (await create.json())?.data?.id ?? null;
    } else {
      const err = await create.json().catch(() => null);
      id = err?.errors?.[0]?.meta?.duplicate_profile_id ?? null;
    }
    if (!id) {
      console.error("[quiz-lead] pas d'id profil");
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    // 2) ajouter tout de suite à la liste (membership instantané)
    await kfetch(
      `https://a.klaviyo.com/api/lists/${LIST_ID}/relationships/profiles/`,
      { method: "POST", body: JSON.stringify({ data: [{ type: "profile", id }] }) }
    );

    // 3) consentement marketing e-mail (best-effort, asynchrone côté Klaviyo)
    kfetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
      method: "POST",
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
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[quiz-lead] exception:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
