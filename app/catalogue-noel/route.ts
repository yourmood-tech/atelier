import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/catalogue-noel.html"), "utf-8");
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
