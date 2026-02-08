import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.CLO_AUTH_TOKEN;

  return NextResponse.json({
    hasToken: !!token,
    tokenLength: token?.length ?? 0,
    tokenTrimmedLength: token?.trim().length ?? 0,
    hasNewline: token?.includes('\n') ?? false,
    hasCarriageReturn: token?.includes('\r') ?? false,
    hasLeadingSpace: token ? token !== token.trimStart() : false,
    hasTrailingSpace: token ? token !== token.trimEnd() : false,
    // Show first/last chars (safe partial reveal for debugging)
    firstThreeChars: token?.slice(0, 3) ?? null,
    lastThreeChars: token?.slice(-3) ?? null,
  });
}
