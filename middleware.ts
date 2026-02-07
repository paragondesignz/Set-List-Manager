import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "clo_auth";
const MEMBER_COOKIE_NAME = "clo_member_auth";

function base64Url(bytes: Uint8Array) {
  const str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

async function hmacSha256Base64Url(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64Url(new Uint8Array(sig));
}

function parseMemberCookie(cookie: string): { token: string; memberId: string; bandSlug: string } | null {
  try {
    const [payloadB64, sigB64] = cookie.split(".");
    if (!payloadB64 || !sigB64) return null;

    const payload = base64UrlDecode(payloadB64);
    const [token, memberId, bandSlug] = payload.split(":");
    if (!token || !memberId || !bandSlug) return null;

    return { token, memberId, bandSlug };
  } catch {
    return null;
  }
}

async function verifyMemberCookie(cookie: string): Promise<{ token: string; memberId: string; bandSlug: string } | null> {
  try {
    const [payloadB64, sigB64] = cookie.split(".");
    if (!payloadB64 || !sigB64) return null;

    const payload = base64UrlDecode(payloadB64);
    const [token, memberId, bandSlug] = payload.split(":");
    if (!token || !memberId || !bandSlug) return null;

    // Verify signature
    const expectedSig = await hmacSha256Base64Url(token, payload);
    if (sigB64 !== expectedSig) return null;

    return { token, memberId, bandSlug };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow public / Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname === "/member-login"
  ) {
    return NextResponse.next();
  }

  // Allow static public assets (rough heuristic)
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json)$/i)) {
    return NextResponse.next();
  }

  const secret = process.env.CLO_AUTH_TOKEN;
  // If no auth configured, do not block.
  if (!secret) return NextResponse.next();

  // Check for admin auth first
  const adminCookie = req.cookies.get(COOKIE_NAME)?.value;
  if (adminCookie) {
    const expected = await hmacSha256Base64Url(secret, "clo_auth_v1");
    if (adminCookie === expected) {
      return NextResponse.next();
    }
  }

  // Check for member auth - members can only access their band's songs
  const memberCookie = req.cookies.get(MEMBER_COOKIE_NAME)?.value;
  if (memberCookie) {
    const memberData = await verifyMemberCookie(memberCookie);
    if (memberData) {
      // Members can access: /[bandSlug]/songs (read-only views)
      const bandSlugMatch = pathname.match(/^\/([^\/]+)/);
      if (bandSlugMatch) {
        const requestedBandSlug = bandSlugMatch[1];

        // Only allow access to their own band's songs pages
        if (requestedBandSlug === memberData.bandSlug) {
          // Allow songs list and individual song pages
          if (
            pathname === `/${memberData.bandSlug}/songs` ||
            pathname.startsWith(`/${memberData.bandSlug}/songs/`) ||
            pathname === `/${memberData.bandSlug}` ||
            pathname === `/${memberData.bandSlug}/setlists` ||
            pathname.startsWith(`/${memberData.bandSlug}/setlists/`)
          ) {
            // Add member info to request headers for the page to use
            const response = NextResponse.next();
            response.headers.set("x-member-id", memberData.memberId);
            response.headers.set("x-member-band-slug", memberData.bandSlug);
            return response;
          }
        }
      }

      // Member trying to access unauthorized page - redirect to their band's songs
      const url = req.nextUrl.clone();
      url.pathname = `/${memberData.bandSlug}/songs`;
      return NextResponse.redirect(url);
    }
  }

  // No valid auth - redirect to login
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
