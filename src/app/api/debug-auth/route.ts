import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => ({
    name: c.name,
    valueLength: c.value.length,
    valuePreview: c.value.substring(0, 20) + "...",
  }));

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: allCookies,
    hasVerifier: allCookies.some(c => c.name.includes("Verifier")),
    hasJWT: allCookies.some(c => c.name.includes("JWT")),
    hasRefreshToken: allCookies.some(c => c.name.includes("RefreshToken")),
  });
}
