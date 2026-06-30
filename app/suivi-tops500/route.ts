import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";

// Suivi mails Tops 500 — accès réservé à l'équipe (@yourmood.net). Partageable Stéphanie / Florian / Amila.
export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");
  const html = readFileSync(path.join(process.cwd(), "html/suivi-tops500.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
