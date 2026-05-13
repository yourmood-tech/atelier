import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  const html = readFileSync(
    path.join(process.cwd(), "html/retouche.html"),
    "utf-8"
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
