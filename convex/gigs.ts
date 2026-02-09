import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const gigStatus = v.union(
  v.literal("enquiry"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled")
);

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
    includeArchived: v.optional(v.boolean()),
    status: v.optional(gigStatus)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== userId) return [];

    const includeArchived = args.includeArchived ?? false;

    let results = await ctx.db
      .query("gigs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    results = results
      .filter((g) => (includeArchived ? true : g.archivedAt === undefined))
      .filter((g) => (args.status ? g.status === args.status : true));

    return results.sort((a, b) => b.date - a.date);
  }
});

export const get = query({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const gig = await ctx.db.get(args.gigId);
    if (!gig) return null;
    const band = await ctx.db.get(gig.bandId);
    if (!band || band.userId !== userId) return null;
    return gig;
  }
});

export const upcoming = query({
  args: {
    bandId: v.id("bands"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== userId) return [];

    const now = Date.now();
    const limit = args.limit ?? 5;

    const all = await ctx.db
      .query("gigs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    return all
      .filter(
        (g) =>
          g.date >= now &&
          g.archivedAt === undefined &&
          (g.status === "enquiry" || g.status === "confirmed")
      )
      .sort((a, b) => a.date - b.date)
      .slice(0, limit);
  }
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    loadInTime: v.optional(v.string()),
    soundcheckTime: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    venuePhone: v.optional(v.string()),
    venueEmail: v.optional(v.string()),
    venueNotes: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    dressCode: v.optional(v.string()),
    setlistId: v.optional(v.id("setlists"))
  },
  handler: async (ctx, args) => {
    await assertBandOwner(ctx, args.bandId);

    const now = Date.now();
    const gigId = await ctx.db.insert("gigs", {
      bandId: args.bandId,
      name: args.name.trim(),
      status: "enquiry",
      date: args.date,
      description: args.description,
      loadInTime: args.loadInTime,
      soundcheckTime: args.soundcheckTime,
      startTime: args.startTime,
      endTime: args.endTime,
      venueName: args.venueName,
      venueAddress: args.venueAddress,
      venuePhone: args.venuePhone,
      venueEmail: args.venueEmail,
      venueNotes: args.venueNotes,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      dressCode: args.dressCode,
      setlistId: args.setlistId,
      createdAt: now,
      updatedAt: now
    });

    // Auto-add all active band members
    const members = await ctx.db
      .query("bandMembers")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const member of members) {
      if (!member.archivedAt) {
        await ctx.db.insert("gigMembers", {
          gigId,
          memberId: member._id,
          status: "pending",
          createdAt: now
        });
      }
    }

    return gigId;
  }
});

export const update = mutation({
  args: {
    gigId: v.id("gigs"),
    patch: v.object({
      name: v.optional(v.string()),
      date: v.optional(v.number()),
      description: v.optional(v.string()),
      loadInTime: v.optional(v.string()),
      soundcheckTime: v.optional(v.string()),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      setTimes: v.optional(v.array(v.object({
        setIndex: v.number(),
        time: v.string()
      }))),
      venueName: v.optional(v.string()),
      venueAddress: v.optional(v.string()),
      venuePhone: v.optional(v.string()),
      venueEmail: v.optional(v.string()),
      venueNotes: v.optional(v.string()),
      contactName: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      dressCode: v.optional(v.string()),
      setlistId: v.optional(v.id("setlists"))
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.gigId);
    if (!existing) throw new Error("Gig not found.");
    await assertBandOwner(ctx, existing.bandId);

    const update: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.patch.name !== undefined) update.name = args.patch.name.trim();
    if (args.patch.date !== undefined) update.date = args.patch.date;
    if (args.patch.description !== undefined) update.description = args.patch.description;
    if (args.patch.loadInTime !== undefined) update.loadInTime = args.patch.loadInTime;
    if (args.patch.soundcheckTime !== undefined) update.soundcheckTime = args.patch.soundcheckTime;
    if (args.patch.startTime !== undefined) update.startTime = args.patch.startTime;
    if (args.patch.endTime !== undefined) update.endTime = args.patch.endTime;
    if (args.patch.setTimes !== undefined) update.setTimes = args.patch.setTimes;
    if (args.patch.venueName !== undefined) update.venueName = args.patch.venueName;
    if (args.patch.venueAddress !== undefined) update.venueAddress = args.patch.venueAddress;
    if (args.patch.venuePhone !== undefined) update.venuePhone = args.patch.venuePhone;
    if (args.patch.venueEmail !== undefined) update.venueEmail = args.patch.venueEmail;
    if (args.patch.venueNotes !== undefined) update.venueNotes = args.patch.venueNotes;
    if (args.patch.contactName !== undefined) update.contactName = args.patch.contactName;
    if (args.patch.contactPhone !== undefined) update.contactPhone = args.patch.contactPhone;
    if (args.patch.contactEmail !== undefined) update.contactEmail = args.patch.contactEmail;
    if (args.patch.dressCode !== undefined) update.dressCode = args.patch.dressCode;
    if (args.patch.setlistId !== undefined) update.setlistId = args.patch.setlistId;

    await ctx.db.patch(args.gigId, update);
  }
});

export const archive = mutation({
  args: { gigId: v.id("gigs"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.gigId);
    if (!existing) throw new Error("Gig not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.patch(args.gigId, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now()
    });
  }
});

export const remove = mutation({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.gigId);
    if (!existing) throw new Error("Gig not found.");
    await assertBandOwner(ctx, existing.bandId);

    // Delete all gig members
    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
      .collect();

    for (const gm of gigMembers) {
      await ctx.db.delete(gm._id);
    }

    await ctx.db.delete(args.gigId);
  }
});

export const updateStatus = mutation({
  args: {
    gigId: v.id("gigs"),
    status: gigStatus
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.gigId);
    if (!existing) throw new Error("Gig not found.");
    await assertBandOwner(ctx, existing.bandId);

    // Validate transitions
    if (existing.status === "cancelled" && args.status === "completed") {
      throw new Error("Cannot mark a cancelled gig as completed.");
    }
    if (existing.status === "completed" && args.status === "enquiry") {
      throw new Error("Cannot revert a completed gig to enquiry.");
    }

    await ctx.db.patch(args.gigId, {
      status: args.status,
      updatedAt: Date.now()
    });
  }
});
