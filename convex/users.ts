import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate user exists
    const user = await ctx.db.get(args.userId as any);
    if (!user) return;

    const update: Record<string, unknown> = {};
    if (args.stripeCustomerId !== undefined) update.stripeCustomerId = args.stripeCustomerId;
    if (args.stripeSubscriptionId !== undefined) update.stripeSubscriptionId = args.stripeSubscriptionId;
    if (args.subscriptionStatus !== undefined) update.subscriptionStatus = args.subscriptionStatus;
    if (args.currentPeriodEnd !== undefined) update.currentPeriodEnd = args.currentPeriodEnd;

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(args.userId as any, update);
    }
  },
});

export const getUserByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();
  },
});
