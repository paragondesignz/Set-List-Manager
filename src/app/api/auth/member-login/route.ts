import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import crypto from "crypto";

export const runtime = "nodejs";

const MEMBER_AUTH_COOKIE_NAME = "clo_member_auth";

function base64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signMemberAuthCookie(token: string, memberId: string, bandSlug: string) {
  const payload = `${token}:${memberId}:${bandSlug}`;
  const h = crypto.createHmac("sha256", token).update(payload).digest();
  return `${base64Url(Buffer.from(payload))}.${base64Url(h)}`;
}

const BodySchema = z.object({
  token: z.string().min(1).max(100)
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return jsonError(500, "Convex is not configured");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request.");

  const token = parsed.data.token.trim();

  // Validate token against Convex
  const client = new ConvexHttpClient(convexUrl);

  try {
    const result = await client.query("bandMembers:getByAccessToken" as any, { token });

    if (!result) {
      return jsonError(401, "Invalid or expired token.");
    }

    const { member, band } = result;

    // Create signed cookie
    const cookieValue = signMemberAuthCookie(token, member._id, band.slug);

    const res = NextResponse.json({
      ok: true,
      member: { name: member.name, role: member.role },
      band: { name: band.name, slug: band.slug }
    });

    res.cookies.set({
      name: MEMBER_AUTH_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90 // 90 days
    });

    return res;
  } catch (e: any) {
    console.error("Member login error:", e);
    return jsonError(500, "Login failed");
  }
}
