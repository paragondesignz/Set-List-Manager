import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, safeEqual, signAuthCookie } from "../_utils";

export const runtime = "nodejs";

const BodySchema = z.object({
  token: z.string().min(1).max(500)
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const secret = process.env.CLO_AUTH_TOKEN;
  if (!secret) return jsonError(400, "Auth is not configured on this environment.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request.");

  const ok = safeEqual(parsed.data.token, secret);
  if (!ok) return jsonError(401, "Invalid token.");

  const value = signAuthCookie(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
  return res;
}
