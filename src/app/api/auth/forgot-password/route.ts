import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Resend } from "resend";

export const runtime = "nodejs";

let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  // Always return success to avoid leaking account existence
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.action(api.users.requestPasswordReset, { email });

    if (result.found && result.token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz";
      const resetUrl = `${siteUrl}/reset-password?token=${result.token}&email=${encodeURIComponent(email)}`;

      const resendClient = getResend();
      if (resendClient) {
        await resendClient.emails.send({
          from: "Set List Creator <noreply@setlistcreator.co.nz>",
          to: [email],
          subject: "Reset your password",
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
              We received a request to reset your password for Set List Creator. Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Reset Password</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Set List Creator</p>
          </div>`,
        });
      }
    }
  } catch {
    // Silently fail — don't leak info
  }

  return NextResponse.json({ ok: true });
}
