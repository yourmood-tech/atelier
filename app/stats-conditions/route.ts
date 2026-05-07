import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const session = await auth();
  if (!session) redirect("/login");

  let html = readFileSync(
    path.join(process.cwd(), "html/stats-conditions.html"),
    "utf-8"
  );
  const userName = session.user?.name || "";
  html = html.replace(
    "</head>",
    `<script>window.__MOOD_USER__ = ${JSON.stringify(userName)};</script></head>`
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
