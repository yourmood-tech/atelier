// Page d'essai « Black Pass deux tiers sous la neige » (maquette avant mise sur le site).
import { readFileSync } from "fs";
import path from "path";
export const dynamic = "force-dynamic";
export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/black-pass-neige.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
