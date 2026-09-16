import { readFileSync } from "fs";
import path from "path";

// Page PUBLIQUE — quizz « Quel garde-mood est fait pour toi ? » (clientes, sans login).
// Public via la règle dédiée dans middleware.ts, comme /quiz (starter pack).
export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/quiz-garde-mood.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
