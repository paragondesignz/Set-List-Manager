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

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
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
    // Let member-authenticated users through to band pages
    // The member cookie validation happens in the existing member-login flow
    return;
  }

  // Require Convex Auth for all other routes
  if (!(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
