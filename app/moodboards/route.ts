import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";
import clientsData from "@/lib/moodboards/clients.json";

// Page Moodboards clientes — accessible aux comptes @yourmood.net.
// Les données clientes sont importées (garanties incluses dans le bundle), puis injectées dans le HTML.
export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  const html = readFileSync(path.join(process.cwd(), "html/moodboards.html"), "utf-8");
  const out = html.replace("/*__CLIENTS__*/", JSON.stringify(clientsData));

  return new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
