import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertBandOwner(ctx: any, bandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const band = await ctx.db.get(bandId);
  if (!band || band.userId !== userId) throw new Error("Not authorized");
  return userId;
}

export const list = query({
  args: {
    bandId: v.id("bands"),
    includeArchived: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== userId) return [];

    const includeArchived = args.includeArchived ?? false;

    const members = await ctx.db
      .query("bandMembers")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    return members
      .filter((m) => (includeArchived ? true : m.archivedAt === undefined))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
});

export const get = query({
  args: { memberId: v.id("bandMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const member = await ctx.db.get(args.memberId);
    if (!member) return null;
    const band = await ctx.db.get(member.bandId);
    if (!band || band.userId !== userId) return null;
    return member;
  }
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    email: v.string(),
    role: v.string()
  },
  handler: async (ctx, args) => {
    await assertBandOwner(ctx, args.bandId);

    const now = Date.now();
    return await ctx.db.insert("bandMembers", {
      bandId: args.bandId,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      role: args.role.trim(),
      createdAt: now
    });
  }
});

export const update = mutation({
  args: {
    memberId: v.id("bandMembers"),
    patch: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found.");
    await assertBandOwner(ctx, existing.bandId);

    const update: Record<string, unknown> = {};
    if (args.patch.name !== undefined) update.name = args.patch.name.trim();
    if (args.patch.email !== undefined) update.email = args.patch.email.trim().toLowerCase();
    if (args.patch.role !== undefined) update.role = args.patch.role.trim();

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(args.memberId, update);
    }
  }
});

export const archive = mutation({
  args: { memberId: v.id("bandMembers"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.patch(args.memberId, {
      archivedAt: args.archived ? Date.now() : undefined
    });
  }
});

export const remove = mutation({
  args: { memberId: v.id("bandMembers") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.delete(args.memberId);
  }
});

// Generate a random access token for a band member
function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const generateAccessToken = mutation({
  args: { memberId: v.id("bandMembers") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found.");
    await assertBandOwner(ctx, existing.bandId);

    const token = generateToken();
    await ctx.db.patch(args.memberId, { accessToken: token });
    return token;
  }
});

export const revokeAccessToken = mutation({
  args: { memberId: v.id("bandMembers") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found.");
    await assertBandOwner(ctx, existing.bandId);

    await ctx.db.patch(args.memberId, { accessToken: undefined });
  }
});

export const getByAccessToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("bandMembers")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.token))
      .first();

    if (!member || member.archivedAt) return null;

    // Get the band info too
    const band = await ctx.db.get(member.bandId);
    if (!band || band.archivedAt) return null;

    return {
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role
      },
      band: {
        _id: band._id,
        name: band.name,
        slug: band.slug
      }
    };
  }
});
