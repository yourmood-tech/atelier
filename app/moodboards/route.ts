import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";

// Page Moodboards clientes — accessible aux comptes @yourmood.net.
// Injecte les données des clientes dans le HTML servi.
export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  const html = readFileSync(path.join(process.cwd(), "html/moodboards.html"), "utf-8");
  const clients = readFileSync(path.join(process.cwd(), "lib/moodboards/clients.json"), "utf-8");
  const out = html.replace("/*__CLIENTS__*/", clients);

  return new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
