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

  if (hasCode) {
    // Capture console.error output from the library
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a: any) => {
        if (a instanceof Error) return a.message + " | " + a.stack?.substring(0, 300);
        if (typeof a === "string") return a;
        try { return JSON.stringify(a)?.substring(0, 300); } catch { return String(a); }
      }).join(" ");
      errors.push(msg);
      origError(...args);
    };

    const response = await authMiddleware(request, event);

    // Restore console.error
    console.error = origError;

    // Log captured errors
    if (errors.length > 0) {
      for (const err of errors) {
        console.log("CAPTURED_AUTH_ERROR: " + err.substring(0, 200));
      }
    } else {
      console.log("OAUTH_CODE_EXCHANGE: no errors captured");
    }

    return response;
  }

  return authMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
