import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    // Protect all routes except auth, login, gorgias webhook, shopify callback, and Next.js internals
    "/((?!api/auth|api/gorgias-webhook|api/produits/shopify-callback|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
