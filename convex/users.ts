import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";
import { internal } from "./_generated/api";

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

// ============================================================================
// Auth Provider
// ============================================================================

export const getAuthProvider = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    return accounts.map((a) => a.provider);
  },
});

// ============================================================================
// Profile
// ============================================================================

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    if (name.length > 100) throw new Error("Name is too long");
    await ctx.db.patch(userId, { name });
  },
});

// ============================================================================
// Account Deletion
// ============================================================================

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete all bands and their cascading data
    const bands = await ctx.db
      .query("bands")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const band of bands) {
      // Delete songs
      const songs = await ctx.db
        .query("songs")
        .withIndex("by_bandId", (q) => q.eq("bandId", band._id))
        .collect();
      for (const song of songs) {
        await ctx.db.delete(song._id);
      }

      // Delete setlists and their items
      const setlists = await ctx.db
        .query("setlists")
        .withIndex("by_bandId", (q) => q.eq("bandId", band._id))
        .collect();
      for (const setlist of setlists) {
        const items = await ctx.db
          .query("setlistItems")
          .withIndex("by_setlistId", (q) => q.eq("setlistId", setlist._id))
          .collect();
        for (const item of items) {
          await ctx.db.delete(item._id);
        }
        await ctx.db.delete(setlist._id);
      }

      // Delete members
      const members = await ctx.db
        .query("bandMembers")
        .withIndex("by_bandId", (q) => q.eq("bandId", band._id))
        .collect();
      for (const member of members) {
        await ctx.db.delete(member._id);
      }

      // Delete templates
      const templates = await ctx.db
        .query("templates")
        .withIndex("by_bandId", (q) => q.eq("bandId", band._id))
        .collect();
      for (const template of templates) {
        await ctx.db.delete(template._id);
      }

      await ctx.db.delete(band._id);
    }

    // Delete auth sessions
    const sessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const session of sessions) {
      // Delete refresh tokens for this session
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      for (const token of tokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    // Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // Delete user record
    await ctx.db.delete(userId);
  },
});

// ============================================================================
// Password Change (internal helpers + action)
// ============================================================================

export const getPasswordAccount = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("provider"), "password")
        )
      )
      .first();
  },
});

export const updatePasswordHash = internalMutation({
  args: { accountId: v.id("authAccounts"), secret: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, { secret: args.secret });
  },
});

// ============================================================================
// Migration: Google → Password (run once, then delete)
// ============================================================================

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const createPasswordAccount = internalMutation({
  args: {
    userId: v.id("users"),
    providerAccountId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("authAccounts", {
      userId: args.userId,
      provider: "password",
      providerAccountId: args.providerAccountId,
      secret: args.secret,
    });
  },
});

export const migrateGoogleUser = action({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const user = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });
    if (!user) throw new Error("User not found");

    const existingPassword = await ctx.runQuery(internal.users.getPasswordAccount, { userId: user._id });
    if (existingPassword) throw new Error("Password account already exists");

    const scrypt = new Scrypt();
    const hash = await scrypt.hash(args.newPassword);

    await ctx.runMutation(internal.users.createPasswordAccount, {
      userId: user._id,
      providerAccountId: args.email,
      secret: hash,
    });

    return { success: true, userId: user._id };
  },
});

// ============================================================================
// Password Reset
// ============================================================================

export const storeResetToken = internalMutation({
  args: { userId: v.id("users"), token: v.string(), expiry: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordResetToken: args.token,
      passwordResetExpiry: args.expiry,
    });
  },
});

export const clearResetToken = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordResetToken: undefined,
      passwordResetExpiry: undefined,
    });
  },
});

export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.runQuery(internal.users.getUserByEmail, { email });
    if (!user) return { found: false };

    // Generate a secure random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    await ctx.runMutation(internal.users.storeResetToken, {
      userId: user._id,
      token,
      expiry,
    });

    return { found: true, token, email: user.email };
  },
});

export const resetPasswordWithToken = action({
  args: {
    token: v.string(),
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const user = await ctx.runQuery(internal.users.getUserByEmail, {
      email: args.email,
    });
    if (!user) throw new Error("Invalid or expired reset link");

    if (
      !user.passwordResetToken ||
      !user.passwordResetExpiry ||
      user.passwordResetToken !== args.token ||
      user.passwordResetExpiry < Date.now()
    ) {
      throw new Error("Invalid or expired reset link");
    }

    const scrypt = new Scrypt();
    const hash = await scrypt.hash(args.newPassword);

    // Check if user already has a password account
    const existing = await ctx.runQuery(internal.users.getPasswordAccount, {
      userId: user._id,
    });

    if (existing) {
      // Update existing password
      await ctx.runMutation(internal.users.updatePasswordHash, {
        accountId: existing._id,
        secret: hash,
      });
    } else {
      // Create password account (e.g. Google-only user)
      await ctx.runMutation(internal.users.createPasswordAccount, {
        userId: user._id,
        providerAccountId: args.email,
        secret: hash,
      });
    }

    // Clear the reset token
    await ctx.runMutation(internal.users.clearResetToken, {
      userId: user._id,
    });

    return { success: true };
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const account = await ctx.runQuery(internal.users.getPasswordAccount, { userId });
    if (!account) {
      throw new Error("No password account found");
    }

    const scrypt = new Scrypt();
    const valid = await scrypt.verify(account.secret!, args.currentPassword);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await scrypt.hash(args.newPassword);
    await ctx.runMutation(internal.users.updatePasswordHash, {
      accountId: account._id,
      secret: newHash,
    });
  },
});
