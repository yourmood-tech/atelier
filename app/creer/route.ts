import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const html = readFileSync(
    path.join(process.cwd(), "html/creer.html"),
    "utf-8"
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
