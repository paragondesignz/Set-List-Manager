import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
  });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { stripeSubscriptionId } = await req.json();

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 }
      );
    }

    await stripe.subscriptions.cancel(stripeSubscriptionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Stripe cancel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
