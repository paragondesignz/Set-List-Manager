import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => ({
    name: c.name,
    valueLength: c.value.length,
  }));

  const debugError = cookieStore.get("__debug_auth_error")?.value;

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: allCookies,
    lastAuthError: debugError ? decodeURIComponent(debugError) : null,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
  });
}
