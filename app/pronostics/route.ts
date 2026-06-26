import { readFileSync } from "fs";
import path from "path";

// Page jeu-concours publique (clientes) — pas de login. L'accès public est
// autorisé dans middleware.ts (comme /sondage, /projet-joaillerie).
export async function GET() {
  const html = readFileSync(
    path.join(process.cwd(), "html/pronostics.html"),
    "utf-8"
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
