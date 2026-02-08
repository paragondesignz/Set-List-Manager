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

  // Check for member auth cookie (band member access still uses cookie-based auth)
  const memberCookie = request.cookies.get("clo_member_auth")?.value;
  if (memberCookie) {
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
