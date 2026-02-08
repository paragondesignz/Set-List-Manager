import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.CLO_AUTH_TOKEN;
  const trimmedToken = token?.trim();

  return NextResponse.json({
    hasToken: !!token,
    hasTrimmedToken: !!trimmedToken,
    tokenLength: token?.length ?? 0,
    tokenTrimmedLength: trimmedToken?.length ?? 0,
    hasNewline: token?.includes('\n') ?? false,
    hasCarriageReturn: token?.includes('\r') ?? false,
    hasLeadingSpace: token ? token !== token.trimStart() : false,
    hasTrailingSpace: token ? token !== token.trimEnd() : false,
    // After trim, token should work
    trimmedTokenFirstThree: trimmedToken?.slice(0, 3) ?? null,
    trimmedTokenLastThree: trimmedToken?.slice(-3) ?? null,
    // Confirm trim removes the issue
    authShouldWork: !!trimmedToken && trimmedToken.length > 0,
  });
}
