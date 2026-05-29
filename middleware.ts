import { auth } from "@/auth";
import { NextResponse } from "next/server";

const WINEUR_ALLOWED = new Set([
  "philippe@yourmood.net",
  "stephanie@yourmood.net",
  "eric@yourmood.net",
  "fabienne@yourmood.net",
]);

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { pathname } = req.nextUrl;
  const isWineurRoute = pathname.startsWith("/wineur") || pathname.startsWith("/api/wineur");

  if (isWineurRoute) {
    const email = req.auth.user?.email ?? "";
    if (!WINEUR_ALLOWED.has(email)) {
      return new NextResponse("Accès non autorisé", { status: 403 });
    }
  }
});

export const config = {
  matcher: [
    // Protect all routes except auth, login, gorgias webhook, shopify callback, public client perso pages, and Next.js internals
    "/((?!api/auth|api/gorgias-webhook|api/orders-webhook|api/produits/shopify-callback|api/creer-demande|api/creer-cart-shopify|api/creer-argent-cart-shopify|api/design|api/design-argent|api/admin|api/quiz-submit|api/mood-lovers|admin|creer|creer-argent|aluminium|argent|sertissages|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
