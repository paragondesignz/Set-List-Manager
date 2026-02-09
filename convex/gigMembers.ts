import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const gigMemberStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("declined")
);

async function assertBandOwner(ctx: any, bandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const band = await ctx.db.get(bandId);
  if (!band || band.userId !== userId) throw new Error("Not authorized");
  return userId;
}

export const listByGig = query({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const gig = await ctx.db.get(args.gigId);
    if (!gig) return [];

    const band = await ctx.db.get(gig.bandId);
    if (!band || band.userId !== userId) return [];

    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    // Enrich with member details
    const enriched = await Promise.all(
      gigMembers.map(async (gm) => {
        const member = await ctx.db.get(gm.memberId);
        return {
          ...gm,
          memberName: member?.name ?? "Unknown",
          memberEmail: member?.email ?? "",
          memberRole: member?.role ?? ""
        };
      })
    );

    return enriched.sort((a, b) => a.memberName.localeCompare(b.memberName));
  }
});

export const respond = mutation({
  args: {
    gigId: v.id("gigs"),
    memberId: v.id("bandMembers"),
    status: gigMemberStatus,
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig) throw new Error("Gig not found.");

    // Find the gigMember record
    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    const gigMember = gigMembers.find((gm) => gm.memberId === args.memberId);
    if (!gigMember) throw new Error("Not a member of this gig.");

    await ctx.db.patch(gigMember._id, {
      status: args.status,
      note: args.note,
      respondedAt: Date.now()
    });
  }
});

export const adminUpdate = mutation({
  args: {
    gigId: v.id("gigs"),
    memberId: v.id("bandMembers"),
    status: gigMemberStatus,
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig) throw new Error("Gig not found.");
    await assertBandOwner(ctx, gig.bandId);

    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    const gigMember = gigMembers.find((gm) => gm.memberId === args.memberId);
    if (!gigMember) throw new Error("Not a member of this gig.");

    const update: Record<string, unknown> = { status: args.status };
    if (args.note !== undefined) update.note = args.note;
    update.respondedAt = Date.now();

    await ctx.db.patch(gigMember._id, update);
  }
});

export const addMember = mutation({
  args: {
    gigId: v.id("gigs"),
    memberId: v.id("bandMembers")
  },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig) throw new Error("Gig not found.");
    await assertBandOwner(ctx, gig.bandId);

    // Check not already added
    const existing = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    if (existing.some((gm) => gm.memberId === args.memberId)) {
      throw new Error("Member already added to this gig.");
    }

    await ctx.db.insert("gigMembers", {
      gigId: args.gigId,
      memberId: args.memberId,
      status: "pending",
      createdAt: Date.now()
    });
  }
});

export const removeMember = mutation({
  args: {
    gigId: v.id("gigs"),
    memberId: v.id("bandMembers")
  },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig) throw new Error("Gig not found.");
    await assertBandOwner(ctx, gig.bandId);

    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    const gigMember = gigMembers.find((gm) => gm.memberId === args.memberId);
    if (!gigMember) throw new Error("Member not found in this gig.");

    await ctx.db.delete(gigMember._id);
  }
});
