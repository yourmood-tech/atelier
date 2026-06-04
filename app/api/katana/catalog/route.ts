// Sert le catalogue des 2208 MTRL Katana existants (lu depuis lib/katana/mtrl-catalog.json).
// Utilisé par la page /katana-generator côté client pour valider chaque mapping proposé.

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const raw = readFileSync(
    path.join(process.cwd(), "lib/katana/mtrl-catalog.json"),
    "utf-8"
  );
  const list = JSON.parse(raw);
  return NextResponse.json({ ok: true, count: list.length, mtrls: list });
}
