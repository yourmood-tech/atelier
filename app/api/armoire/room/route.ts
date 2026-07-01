import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCustomerArmoire } from "@/lib/shopify";
import { isStaffEmail } from "@/lib/armoire-catalog";

// Sauvegarde SERVEUR de la chambre d'une cliente (avatar + déco posée + couleurs + positions).
// Même preuve de propriété que pour ouvrir l'armoire (email + n° de commande). Staff = autorisé.
// Permet l'affichage admin + la synchro d'un appareil à l'autre.

const digits = (s: string) => (s || "").replace(/\D/g, "");
const roomKey = (email: string) => `armoire:room:${email.trim().toLowerCase()}`;

export type ArmoireRoom = {
  avatarPick: unknown;
  avatarImage: string | null;
  avatarOn: boolean;
  placed: string[];
  active: Record<string, string>;
  layout: Record<string, { left: number; top: number; w: number }>;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const orderNumber = String(body?.orderNumber ?? "").trim();
    const room = body?.room;
    if (!/\S+@\S+\.\S+/.test(email) || !room || typeof room !== "object") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const staff = isStaffEmail(email);
    if (!staff) {
      const armoire = await getCustomerArmoire(email);
      if (!armoire.found || !armoire.orderNames.some((n) => digits(n) === digits(orderNumber))) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    // avatarImage = un CHEMIN court (/avatars/..). On refuse les data:URL (trop lourds).
    const img = typeof room.avatarImage === "string" && !room.avatarImage.startsWith("data:")
      ? room.avatarImage.slice(0, 300) : null;

    const blob: ArmoireRoom = {
      avatarPick: room.avatarPick ?? null,
      avatarImage: img,
      avatarOn: !!room.avatarOn,
      placed: Array.isArray(room.placed) ? room.placed.slice(0, 200).map(String) : [],
      active: room.active && typeof room.active === "object" ? room.active : {},
      layout: room.layout && typeof room.layout === "object" ? room.layout : {},
    };
    await kv.set(roomKey(email), blob);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[armoire/room] error", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
