import { readFileSync } from "fs";
import path from "path";

// Page PUBLIQUE — « Quel starter pack es-tu ? » (quizz clientes, sans login).
// Public via la règle dédiée dans middleware.ts.
export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/quiz.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
