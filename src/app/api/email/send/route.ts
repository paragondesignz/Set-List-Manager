import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

// Lazy initialize to avoid build-time errors when RESEND_API_KEY is not set
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const AttachmentSchema = z.object({
  filename: z.string(),
  content: z.string() // base64-encoded
});

const BodySchema = z.object({
  to: z.array(z.string().email()),
  subject: z.string().min(1),
  html: z.string().min(1),
  from: z.string().optional(),
  replyTo: z.string().email().optional(),
  senderName: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional()
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const resendClient = getResend();
  if (!resendClient) {
    return jsonError(500, "Email is not configured");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request: " + parsed.error.message);
  }

  try {
    // Convert base64 attachments to Buffers for Resend
    const attachments = parsed.data.attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64")
    }));

    const { data, error } = await resendClient.emails.send({
      from: parsed.data.from ?? "Set List Creator <noreply@setlistcreator.co.nz>",
      to: parsed.data.to,
      subject: parsed.data.subject,
      html: parsed.data.html,
      replyTo: parsed.data.replyTo,
      ...(attachments && attachments.length > 0 ? { attachments } : {})
    });

    if (error) {
      return jsonError(500, error.message);
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return jsonError(500, e?.message ?? "Failed to send email");
  }
}
