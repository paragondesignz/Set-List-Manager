import crypto from "crypto";

export const AUTH_COOKIE_NAME = "clo_auth";
export const MEMBER_AUTH_COOKIE_NAME = "clo_member_auth";
export const AUTH_MESSAGE = "clo_auth_v1";

function base64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function signAuthCookie(secret: string) {
  const h = crypto.createHmac("sha256", secret).update(AUTH_MESSAGE).digest();
  return base64Url(h);
}

export function signMemberAuthCookie(token: string, memberId: string, bandSlug: string) {
  // Store token:memberId:bandSlug in a signed format
  const payload = `${token}:${memberId}:${bandSlug}`;
  const h = crypto.createHmac("sha256", token).update(payload).digest();
  return `${base64Url(Buffer.from(payload))}.${base64Url(h)}`;
}

export function parseMemberAuthCookie(cookie: string): { token: string; memberId: string; bandSlug: string } | null {
  try {
    const [payloadB64, sigB64] = cookie.split(".");
    if (!payloadB64 || !sigB64) return null;

    // Decode payload
    const payload = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
    const [token, memberId, bandSlug] = payload.split(":");
    if (!token || !memberId || !bandSlug) return null;

    // Verify signature
    const expectedSig = crypto.createHmac("sha256", token).update(payload).digest();
    const expectedSigB64 = base64Url(expectedSig);

    if (!safeEqual(sigB64, expectedSigB64)) return null;

    return { token, memberId, bandSlug };
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
