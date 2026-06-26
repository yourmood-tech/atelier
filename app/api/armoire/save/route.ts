import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire, type ArmoireOverrides } from "@/lib/shopify";

// Sauvegarde des personnalisations d'une cliente (déplacer un bijou / photo perso).
// Sécurité : on n'écrit que si email + numéro de commande correspondent (même preuve
// que pour ouvrir l'armoire). Stockage par cliente sous armoire:ov:<email>.

const ovKey = (email: string) => `armoire:ov:${email.trim().toLowerCase()}`;
const digits = (s: string) => (s || "").replace(/\D/g, "");
const MAX_IMG = 400_000; // ~300 Ko en base64 — garde-fou taille

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const orderNumber = String(body?.orderNumber ?? "").trim();
    const key = String(body?.key ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(email) || !digits(orderNumber) || !key) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    if (typeof body?.image === "string" && body.image.length > MAX_IMG) {
      return NextResponse.json({ error: "Photo trop lourde" }, { status: 413 });
    }

    // Vérification de propriété
    const armoire = await getCustomerArmoire(email);
    if (!armoire.found || !armoire.orderNames.some((n) => digits(n) === digits(orderNumber))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const k = ovKey(email);
    const current = ((await kv.get(k)) as ArmoireOverrides | null) ?? {};
    const entry = { ...(current[key] ?? {}) };

    if (typeof body?.tiroir === "string" && body.tiroir) entry.tiroir = body.tiroir;
    if (typeof body?.image === "string") {
      if (body.image === "") delete entry.image;
      else entry.image = body.image;
    }

    current[key] = entry;
    await kv.set(k, current);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[armoire/save] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
