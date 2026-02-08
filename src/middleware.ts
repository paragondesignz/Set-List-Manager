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
  "/api/debug-auth",
]);

const isAuthPage = createRouteMatcher(["/", "/login"]);

const authMiddleware = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();

  if (authenticated && isAuthPage(request)) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  if (isPublicRoute(request)) {
    return;
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json)$/i)) {
    return;
  }

  const memberCookie = request.cookies.get("clo_member_auth")?.value;
  if (memberCookie) {
    return;
  }

  if (!authenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
}, { verbose: true });

export default async function middleware(request: any, event: any) {
  const url = new URL(request.url);
  const hasCode = url.searchParams.has("code");
  const cookieNames = [...request.cookies.getAll()].map((c: any) => c.name);

  if (hasCode) {
    const debugInfo = {
      host: request.headers.get("host"),
      path: url.pathname,
      cookies: cookieNames,
      hasVerifier: cookieNames.some((n: string) => n.includes("Verifier")),
      hasJWT: cookieNames.some((n: string) => n.includes("JWT")),
    };
    // Log each field separately so Vercel doesn't truncate
    console.log("OAUTH_BEFORE host=" + debugInfo.host);
    console.log("OAUTH_BEFORE cookies=" + cookieNames.join(","));
    console.log("OAUTH_BEFORE hasVerifier=" + debugInfo.hasVerifier);
    console.log("OAUTH_BEFORE hasJWT=" + debugInfo.hasJWT);
  }

  const response = await authMiddleware(request, event);

  if (hasCode && response) {
    const setCookies = response?.headers?.getSetCookie?.() ?? [];
    console.log("OAUTH_AFTER status=" + response?.status);
    console.log("OAUTH_AFTER location=" + (response?.headers?.get("location") || "none"));
    console.log("OAUTH_AFTER setCookies=" + setCookies.map((c: string) => c.split("=")[0]).join(","));
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
