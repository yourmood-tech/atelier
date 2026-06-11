import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";
import { kv } from "@vercel/kv";

// Admin PROTÉGÉ (@yourmood.net) — liste les demandes de projet joaillerie.
export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  let demandes: unknown[] = [];
  try {
    const ids = (await kv.smembers("projetjoa:index")) as string[] | null;
    if (ids && ids.length) {
      const vals = (await kv.mget(...ids.map((i) => "projetjoa:" + i))) as (Record<string, unknown> | null)[];
      demandes = vals.filter(Boolean).sort((a, b) =>
        String((b as { date?: string }).date || "").localeCompare(String((a as { date?: string }).date || "")));
    }
  } catch { /* vide */ }

  const html = readFileSync(path.join(process.cwd(), "html/projet-joaillerie-admin.html"), "utf-8");
  const out = html.replace("/*__DEMANDES__*/", JSON.stringify(demandes));
  return new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
