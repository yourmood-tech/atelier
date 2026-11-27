// Page publique « Le calendrier mood — la maison des pépites » : un tiroir s'ouvre chaque jour (décembre 2026).
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/calendrier-maison.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
