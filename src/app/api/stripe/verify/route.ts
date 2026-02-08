import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";

export const runtime = "nodejs";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
  });
}

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

/**
 * Helper to extract subscription details and update Convex.
 */
async function updateFromSubscription(
  convex: ConvexHttpClient,
  sub: Stripe.Subscription,
  userId: string
) {
  const periodEnd =
    (sub as any).current_period_end ??
    sub.items?.data?.[0]?.current_period_end;
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as any)?.id;

  await convex.mutation("users:updateSubscription" as any, {
    userId,
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    currentPeriodEnd: periodEnd ? periodEnd * 1000 : undefined,
  });

  return sub.status;
}

/**
 * Subscription verification endpoint.
 *
 * Supports two modes:
 * 1. Post-checkout: pass { sessionId } to verify via Stripe checkout session
 * 2. Manual refresh: pass { userId, email } to look up subscription by email
 *
 * This ensures subscription status is correct even if the webhook
 * was delayed or failed.
 */
export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const convex = getConvex();
    const body = await req.json();
    const { sessionId, userId, email } = body;

    // Mode 1: Verify via checkout session ID (post-checkout flow)
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      const sessionUserId = session.metadata?.userId;
      if (!sessionUserId) {
        return NextResponse.json(
          { error: "No user ID in session metadata" },
          { status: 400 }
        );
      }

      let subscription =
        typeof session.subscription === "object"
          ? (session.subscription as Stripe.Subscription)
          : null;

      if (!subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;
        if (!subscriptionId) {
          return NextResponse.json(
            { error: "No subscription found" },
            { status: 400 }
          );
        }
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      }

      const status = await updateFromSubscription(
        convex,
        subscription,
        sessionUserId
      );
      return NextResponse.json({ status });
    }

    // Mode 2: Look up subscription by email (manual refresh)
    if (userId && email) {
      // Search for Stripe customers with this email
      const customers = await stripe.customers.list({
        email,
        limit: 5,
      });

      for (const customer of customers.data) {
        // Check for active or trialing subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const status = await updateFromSubscription(
            convex,
            subscriptions.data[0],
            userId
          );
          return NextResponse.json({ status });
        }

        // Also check for trialing subscriptions
        const trialingSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "trialing",
          limit: 1,
        });

        if (trialingSubs.data.length > 0) {
          const status = await updateFromSubscription(
            convex,
            trialingSubs.data[0],
            userId
          );
          return NextResponse.json({ status });
        }
      }

      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json(
      { error: "Provide either sessionId or userId + email" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Verify subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
