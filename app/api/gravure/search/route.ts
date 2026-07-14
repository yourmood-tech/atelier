import { NextRequest, NextResponse } from "next/server";
import index from "@/lib/gravure/index.json";

type F = { nom: string; fichier: string; type: string; chemin: string };
const FILES = index as F[];

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Recherche des fichiers de gravure (.gnh) par nom.
export async function GET(req: NextRequest) {
  const q = norm(req.nextUrl.searchParams.get("q") || "");
  if (!q) return NextResponse.json({ files: [], total: FILES.length });
  const hits = FILES.filter((f) => norm(f.nom).includes(q)).slice(0, 60);
  return NextResponse.json({ files: hits, total: FILES.length });
}
