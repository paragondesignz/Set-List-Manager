import { NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/member-login",
  "/subscribe",
  "/api/auth/(.*)",
  "/api/stripe/(.*)",
]);

const isAuthPage = createRouteMatcher(["/", "/login"]);

const authMiddleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

  // If authenticated and on landing page or login, redirect to dashboard
  if (authenticated && isAuthPage(request)) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  // Allow public routes
  if (isPublicRoute(request)) {
    return;
  }

  // Allow static assets
  const pathname = request.nextUrl.pathname;
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json)$/i)) {
    return;
  }

  // Check for member auth cookie (band member access still uses cookie-based auth)
  const memberCookie = request.cookies.get("clo_member_auth")?.value;
  if (memberCookie) {
    return;
  }

  // Require Convex Auth for all other routes
  if (!authenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
}, { verbose: true });

// Wrap with debug logging
export default async function middleware(request: any, event: any) {
  const url = new URL(request.url);
  const hasCode = url.searchParams.has("code");
  const cookieNames = [...request.cookies.getAll()].map((c: any) => c.name);

  if (hasCode) {
    console.log("=== AUTH CODE EXCHANGE ===");
    console.log("URL:", url.pathname + url.search.substring(0, 50));
    console.log("Host:", request.headers.get("host"));
    console.log("All cookies:", cookieNames.join(", "));
    console.log("Has verifier cookie:",
      cookieNames.some((n: string) => n.includes("convexAuthOAuthVerifier")));
    console.log("Has JWT cookie:",
      cookieNames.some((n: string) => n.includes("convexAuthJWT")));
  }

  const response = await authMiddleware(request, event);

  if (hasCode) {
    console.log("=== AFTER CODE EXCHANGE ===");
    console.log("Response status:", response?.status);
    console.log("Response Location:", response?.headers?.get("location"));
    const setCookies = response?.headers?.getSetCookie?.() ?? [];
    console.log("Set-Cookie headers:", setCookies.length);
    for (const c of setCookies) {
      // Log cookie name only, not value
      const name = c.split("=")[0];
      console.log("  Setting cookie:", name);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
