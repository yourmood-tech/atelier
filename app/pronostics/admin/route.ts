import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";

// Écran staff : saisie des résultats + liste des gagnantes. Protégé par login
// (/pronostics/admin est exclu de l'accès public dans middleware.ts).
export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  const html = readFileSync(
    path.join(process.cwd(), "html/pronostics-admin.html"),
    "utf-8"
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
