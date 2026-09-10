import { readFileSync } from "fs";
import path from "path";

// Page PUBLIQUE — « Créez votre bague en pierres » (configurateur de motif, clientes, sans login).
// Public via la règle dédiée dans middleware.ts. L'admin (/motif/admin) reste protégé.
export async function GET() {
  const html = readFileSync(path.join(process.cwd(), "html/motif.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
