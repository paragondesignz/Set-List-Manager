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

/**
 * Decode and validate a member auth cookie.
 * Cookie format: base64url(token:memberId:bandSlug).base64url(hmac)
 * Returns { token, memberId, bandSlug } if valid, null otherwise.
 */
function parseMemberCookie(cookieValue: string): {
  token: string;
  memberId: string;
  bandSlug: string;
} | null {
  try {
    const [payloadB64] = cookieValue.split(".");
    if (!payloadB64) return null;

    // Restore standard base64 from base64url
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = Buffer.from(base64, "base64").toString("utf-8");
    const parts = payload.split(":");

    if (parts.length !== 3) return null;
    const [token, memberId, bandSlug] = parts;
    if (!token || !memberId || !bandSlug) return null;

    return { token, memberId, bandSlug };
  } catch {
    return null;
  }
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
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

  // Check for member auth cookie — validate and restrict to their band
  const memberCookie = request.cookies.get("clo_member_auth")?.value;
  if (memberCookie) {
    const parsed = parseMemberCookie(memberCookie);
    if (!parsed) {
      // Invalid cookie — redirect to member login
      return nextjsMiddlewareRedirect(request, "/member-login");
    }

    // Members can only access specific read-only routes for their band
    const bandPrefix = `/${parsed.bandSlug}`;
    const memberAllowedRoutes = [
      `${bandPrefix}/songs`,           // Song list (read-only)
      `${bandPrefix}/setlists`,        // Setlist list (finalised only)
    ];

    // Allow exact matches (song list, setlist list)
    const isExactMatch = memberAllowedRoutes.includes(pathname);

    // Allow setlist detail pages: /{bandSlug}/setlists/{setlistId}
    // but NOT sub-routes like /builder, /export, /new
    const setlistDetailPattern = new RegExp(
      `^${bandPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/setlists/[^/]+$`
    );
    const isSetlistDetail =
      setlistDetailPattern.test(pathname) &&
      !pathname.endsWith("/new");

    if (!isExactMatch && !isSetlistDetail) {
      return nextjsMiddlewareRedirect(
        request,
        `${bandPrefix}/songs`
      );
    }

    return;
  }

  // Require Convex Auth for all other routes
  if (!authenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
