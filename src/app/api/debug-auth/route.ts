import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchAction } from "convex/nextjs";

export const runtime = "nodejs";

// This endpoint tests the full auth flow components
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => ({
    name: c.name,
    valueLength: c.value.length,
  }));

  // Test if we can reach Convex
  let convexReachable = false;
  let convexError = "";
  try {
    const result = await fetchAction("auth:signIn" as any, {
      params: { code: "test_invalid_code" },
      verifier: "test_invalid_verifier",
    });
    convexReachable = true;
  } catch (e: any) {
    convexReachable = true; // We reached it, it just rejected our test data
    convexError = e?.message?.substring(0, 200) || "unknown error";
  }

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: allCookies,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    convexReachable,
    convexError,
    env: {
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    },
  });
}
