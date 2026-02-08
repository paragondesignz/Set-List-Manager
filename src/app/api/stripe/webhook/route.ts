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

export async function POST(req: Request) {
  const stripe = getStripe();
  const convex = getConvex();

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as any)?.id;

          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : (session.customer as any)?.id;

          // Fetch the subscription to get the real status and period end
          let subscriptionStatus = "active";
          let currentPeriodEnd: number | undefined;
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionStatus = sub.status;
            const periodEnd = (sub as any).current_period_end
              ?? sub.items?.data?.[0]?.current_period_end;
            if (periodEnd) {
              currentPeriodEnd = periodEnd * 1000;
            }
          }

          await convex.mutation("users:updateSubscription" as any, {
            userId,
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            subscriptionStatus,
            currentPeriodEnd,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const periodEnd = (subscription as any).current_period_end
            ?? subscription.items?.data?.[0]?.current_period_end;
          await convex.mutation("users:updateSubscription" as any, {
            userId,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: periodEnd ? periodEnd * 1000 : undefined,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await convex.mutation("users:updateSubscription" as any, {
            userId,
            subscriptionStatus: "canceled",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          if (userId) {
            await convex.mutation("users:updateSubscription" as any, {
              userId,
              subscriptionStatus: "past_due",
            });
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
