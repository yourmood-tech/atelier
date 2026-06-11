import { readFileSync } from "fs";
import path from "path";

// Formulaire PUBLIC — projet joaillerie sur-mesure (clientes, sans login).
// Public via la règle dédiée dans middleware.ts.
export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/projet-joaillerie.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
