// Page publique « Le calendrier mood — une pépite chaque jour » (décembre 2026).
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/calendrier-decembre.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
