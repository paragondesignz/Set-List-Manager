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
    const { userId, email } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      currency: "nzd",
      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name: "Set List Creator Pro",
              description: "Professional setlist creation for cover bands",
            },
            unit_amount: 795, // $7.95 NZD in cents
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId },
      },
      customer_email: email || undefined,
      metadata: { userId },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz"}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz"}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
